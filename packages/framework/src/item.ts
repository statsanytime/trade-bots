import get from 'lodash/get';
import { PipelineItemContext } from './pipelines.js';
import type { PriceSourceName } from './priceSources/types.js';

interface ItemOptions {
    pipelineContext: PipelineItemContext;
    marketName: string;
    marketId: string | number;
    priceUsd: number;
}

export class Item {
    pipelineContext: PipelineItemContext;
    marketName: string;
    marketId: string | number;
    priceUsd: number;

    constructor(options: ItemOptions) {
        this.pipelineContext = options.pipelineContext;
        this.marketName = options.marketName;
        this.marketId = options.marketId;
        this.priceUsd = options.priceUsd;
    }

    getPrice(sourceName: PriceSourceName, attributes: string) {
        const source = this.pipelineContext.bot.priceSources.find(
            (source) => source.name === sourceName,
        );

        if (!source) {
            throw new Error(`Price source ${sourceName} not found`);
        }

        return source.getPrice(this.marketName, attributes);
    }
}
