import { consola } from 'consola';
import { createHooks, Hookable } from 'hookable';
import { getContext as unGetContext } from 'unctx';
import { AsyncLocalStorage } from 'node:async_hooks';
import { BotOptions, Pipeline, PipelineContext, Plugin } from './types.js';

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

export async function startBots(bots: Bot[]) {
    for (const bot of bots) {
        consola.info(
            `Started bot ${bot.name} with pipeline ${bot.pipeline.name}`,
        );

        const context = getContext();

        const contextData: PipelineContext = { bot };

        context.call(
            contextData,
            () => bot.pipeline.handler(),
        );
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

        this.bootPlugins();
    }

    bootPlugins() {
        Object.values(this.plugins).forEach((plugin) => {
            plugin.boot?.(this);
        });
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
