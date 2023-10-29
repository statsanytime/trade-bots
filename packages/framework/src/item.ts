import { Bot } from './index.js';

interface ItemOptions {
    bot: Bot;
    marketName: string;
    marketId: string | number;
    priceUsd: number;
    assetId?: string;
}

export class Item {
    bot: Bot;
    marketName: string;
    marketId: string | number;
    priceUsd: number;
    assetId?: string;

    constructor(options: ItemOptions) {
        this.bot = options.bot;
        this.marketName = options.marketName;
        this.marketId = options.marketId;
        this.priceUsd = options.priceUsd;
        this.assetId = options.assetId;
    }

    getPrice(sourceName: string, attributes: string) {
        const source = this.bot.priceSources[sourceName];

        if (!source) {
            throw new Error(`Price source ${sourceName} not found`);
        }

        return source.getPrice(this.marketName, attributes);
    }
}
