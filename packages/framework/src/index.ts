import { PipelineContext } from './pipelines.js';
import type { Bot } from './types.js';

export async function startBots(bots: Bot[]) {
    for (const bot of bots) {
        console.log(`Started bot ${bot.name} with pipeline ${bot.pipeline.name}`);

        bot.pipeline.handler.call(new PipelineContext(bot));
    }
}

export { createPipeline } from './pipelines.js';
