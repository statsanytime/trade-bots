import { CSGOEmpireMarketplace } from '@statsanytime/trade-bots';
import { RedepositorPipeline } from './pipelines/redepositor.js';
import 'dotenv/config.js';

export const bot1 = {
    pipeline: RedepositorPipeline,
    marketplaces: [
        new CSGOEmpireMarketplace({
            apiKey: process.env.CSGOEMPIRE_API_KEY,
        })
    ],
};
