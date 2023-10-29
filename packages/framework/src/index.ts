import { consola } from 'consola';
import { createHooks, Hookable } from 'hookable';
import { PipelineContext } from './pipelines.js';
import { BotOptions, Pipeline, Plugin } from './types.js';

export async function startBots(bots: Bot[]) {
    for (const bot of bots) {
        consola.info(
            `Started bot ${bot.name} with pipeline ${bot.pipeline.name}`,
        );

        bot.pipeline.handler.call(new PipelineContext(bot));
    }
}

export class Bot {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Record<string, Plugin>;
    priceSources: Record<string, any>;
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

        this.priceSources = {};

        this.hooks = createHooks();

        this.bootPlugins();
    }

    bootPlugins() {
        Object.values(this.plugins).forEach((plugin) => {
            plugin.boot(this);
        });
    }

    hasPlugin(plugin: string) {
        return !!this.plugins[plugin];
    }

    registerPriceSource(key: string, priceSource: any) {
        this.priceSources[key] = priceSource;
    }
}

export function createBot(options: BotOptions) {
    return new Bot(options);
}

export { createPipeline } from './pipelines.js';

export * from './types.js';
export * from './pipelines.js';
export * from './item.js';
