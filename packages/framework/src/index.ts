import { AsyncLocalStorage } from 'node:async_hooks';
import consola from 'consola';
import { createHooks, Hookable } from 'hookable';
import { getContext as unGetContext } from 'unctx';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type {
    BotOptions,
    Pipeline,
    PipelineContext,
    Plugin,
    ScheduleDepositOptions,
    ScheduledDeposit,
} from './types.js';
import { appendStorageItem, storage } from './storage.js';
import { handleError } from './errors.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const getContext = () =>
    unGetContext<PipelineContext>('@statsanytime/trade-bots', {
        asyncContext: true,
        AsyncLocalStorage,
    });

export const useContext = () => getContext().use();

export function listen(event: string, handler: (event: any) => void) {
    const context = useContext();

    context.bot.hooks.callHook('pipeline:listen', {
        event,
        handler,
    });
}

export function scheduleDeposit(options: ScheduleDepositOptions) {
    return appendStorageItem('scheduled-deposits', options);
}

export async function getScheduledDeposits(
    filters: Partial<ScheduledDeposit> = {},
): Promise<ScheduledDeposit[]> {
    const items = (await storage.getItem('scheduled-deposits')) ?? [];

    if (!Array.isArray(items)) {
        throw new Error(
            'Scheduled deposits is not an array. This should not happen.',
        );
    }

    return items.filter((item: ScheduledDeposit) => {
        for (const [key, value] of Object.entries(filters) as [
            keyof ScheduledDeposit,
            ScheduledDeposit[keyof ScheduledDeposit],
        ][]) {
            if (item[key] !== value) {
                return false;
            }
        }

        return true;
    });
}

// Steam lock trades for 7 days after the trade is created
// However, it's only unlocked once per day at midnight PST, meaning it can be locked for almost 8 days
export function depositIsTradable(withdrawnAt: Dayjs) {
    // Define the unlock time at midnight PST
    const unlockTimePST = withdrawnAt
        .clone()
        .tz('PST') // Set to PST
        .add(8, 'days') // Add 8 days
        .startOf('day'); // Set to midnight

    const now = dayjs();

    return now.isAfter(unlockTimePST) || now.isSame(unlockTimePST, 'minute');
}

export async function startBots(bots: Bot[]) {
    for (const bot of bots) {
        consola.info(
            `Started bot ${bot.name} with pipeline ${bot.pipeline.name}`,
        );

        const context = getContext();

        const contextData: PipelineContext = { bot };

        context.call(contextData, async () => {
            try {
                await bot.bootPlugins();
                await bot.pipeline.handler();
            } catch (err) {
                handleError(err);
            }
        });
    }
}

export class Bot {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Record<string, Plugin>;
    hooks: Hookable;

    constructor(options: BotOptions) {
        this.name = options.name;
        this.pipeline = options.pipeline;

        this.plugins = options.plugins.reduce(
            (acc, plugin) => {
                acc[plugin.name] = plugin;

                return acc;
            },
            {} as Record<string, Plugin>,
        );

        this.hooks = createHooks();
    }

    bootPlugins(): Promise<void[]> {
        return Promise.all(
            Object.values(this.plugins)
                .map((plugin) => plugin.boot?.())
                .filter(Boolean),
        );
    }
}

export function createBot(options: BotOptions) {
    return new Bot(options);
}

export { createPipeline } from './pipelines.js';

export * from './types.js';
export * from './pipelines.js';
export * from './item.js';
export * from './storage.js';
export * from './errors.js';
