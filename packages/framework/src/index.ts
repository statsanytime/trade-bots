import { consola } from 'consola';
import { PipelineContext } from './pipelines.js';
import type { Bot } from './types.js';

export async function startBots(bots: Bot[]) {
    for (const bot of bots) {
        consola.info(
            `Started bot ${bot.name} with pipeline ${bot.pipeline.name}`,
        );

        bot.pipeline.handler.call(new PipelineContext(bot));
    }
}

// Just for simple typing
export function createBot(options: Bot) {
    return options;
}

export { createPipeline } from './pipelines.js';
export { CSGOEmpireMarketplace } from './marketplaces/csgoempire.js';
export { PricempirePriceSource } from './priceSources/pricempire.js';
