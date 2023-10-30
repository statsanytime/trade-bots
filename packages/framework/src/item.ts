import { ItemOptions } from './types.js';

export class Item {
    marketName: string;
    marketId: string | number;
    priceUsd: number;
    assetId?: string;

    constructor(options: ItemOptions) {
        this.marketName = options.marketName;
        this.marketId = options.marketId;
        this.priceUsd = options.priceUsd;
        this.assetId = options.assetId;
    }
}
