import { AsyncLocalStorage } from 'node:async_hooks';
import consola from 'consola';
import { createHooks, Hookable } from 'hookable';
import { getContext as unGetContext } from 'unctx';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import type {
    BotOptions,
    Pipeline,
    PipelineContext,
    Plugin,
    ScheduleDepositOptions,
    ScheduledDeposit,
} from './types.js';
import { handleError } from './errors.js';
import { createStorage, Storage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { getWithdrawal } from './trades.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const getContext = () =>
    unGetContext<PipelineContext>('@statsanytime/trade-bots', {
        asyncContext: true,
        AsyncLocalStorage,
    });

export const useContext = () => getContext().use();

export async function appendStorageItem(
    storage: Storage,
    key: string,
    item: any,
) {
    const curr = (await storage.getItem(key)) || [];

    if (!Array.isArray(curr)) {
        throw new Error(`Expected ${key} to be an array`);
    }

    await storage.setItem(key, [...curr, item]);
}

export function scheduleDeposit(options: ScheduleDepositOptions) {
    const context = useContext();

    return appendStorageItem(
        context.bot.storage,
        'scheduled-deposits',
        options,
    );
}

export async function getScheduledDeposits(
    filters: Partial<ScheduledDeposit> = {},
): Promise<ScheduledDeposit[]> {
    const context = useContext();

    const items =
        (await context.bot.storage.getItem('scheduled-deposits')) ?? [];

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

export async function removeScheduledDeposit(
    scheduledDeposit: ScheduledDeposit,
) {
    const context = useContext();

    const scheduledDeposits: ScheduledDeposit[] | null =
        await context.bot.storage.getItem('scheduled-deposits');

    if (!scheduledDeposits) {
        return;
    }

    await context.bot.storage.setItem(
        'scheduled-deposits',
        scheduledDeposits.filter(
            (d: ScheduledDeposit) =>
                !(
                    d.marketplace === scheduledDeposit.marketplace &&
                    d.withdrawalId === scheduledDeposit.withdrawalId
                ),
        ),
    );
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

export async function checkScheduledDeposits(bot: Bot) {
    const context = getContext();

    const contextData: PipelineContext = { bot };

    context.call(contextData, async () => {
        const deposits = await getScheduledDeposits();

        const toDepositPromises = deposits.map(async (deposit) => {
            const withdrawal = await getWithdrawal(deposit.withdrawalId);

            if (!withdrawal) {
                return false;
            }

            return depositIsTradable(dayjs(withdrawal.madeAt))
                ? deposit
                : false;
        });

        const toDeposit = (await Promise.all(toDepositPromises)).filter(
            Boolean,
        ) as ScheduledDeposit[];

        for (const depositObject of toDeposit) {
            const withdrawal = await getWithdrawal(depositObject.withdrawalId);

            if (!withdrawal) {
                continue;
            }

            contextData.withdrawal = withdrawal;
            contextData.item = withdrawal.item;

            await bot.hooks.callHook('deposit-redepositable', depositObject);
        }
    });
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
                await checkScheduledDeposits(bot);
            } catch (err) {
                handleError(err);
            }
        });

        setInterval(() => checkScheduledDeposits(bot), 1000 * 60 * 5);
    }
}

export class Bot {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Record<string, Plugin>;
    hooks: Hookable;
    storage: Storage;
    listeners: Record<string, Function[]>;

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
        this.listeners = {};

        this.storage =
            options.storage ??
            createStorage({
                driver: fsDriver({
                    base: './.statsanytime',
                }),
            });
    }

    bootPlugins(): Promise<void[]> {
        return Promise.all(
            Object.values(this.plugins)
                .map((plugin) => plugin.boot?.())
                .filter(Boolean),
        );
    }

    registerListener(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(listener);
    }
}

export function createBot(options: BotOptions) {
    return new Bot(options);
}

export { createPipeline } from './pipelines.js';

export * from './types.js';
export * from './pipelines.js';
export * from './item.js';
export * from './errors.js';
export * from './trades.js';
