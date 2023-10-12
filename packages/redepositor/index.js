import { createBot, createPipeline } from '@statsanytime/trade-bots';
import { createCSGOEmpirePlugin } from '@statsanytime/trade-bots-csgoempire';
import { RedepositorPipeline } from './pipelines/redepositor.js';
import 'dotenv/config.js';

const RedepositorPipeline = createPipeline('Redepositor', function () {
    this.listen('csgoempire:item-buyable', function (item) {
        console.log(item);
    });
});

export const bot1 = createBot({
    pipeline: RedepositorPipeline,
    plugins: [
        createCSGOEmpirePlugin({
            apiKey: process.env.CSGOEMPIRE_API_KEY,
        }),
    ],
});
