import { RedepositorPipeline } from './pipelines/redepositor.js';
import 'dotenv/config.js';

export const bot1 = {
    pipeline: RedepositorPipeline,
    marketplaces: {
        csgoempire: {
            apiKey: process.env.CSGOEMPIRE_API_KEY,
        },
    },
};
