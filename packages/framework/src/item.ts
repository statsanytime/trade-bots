import { PipelineItemContext } from './pipelines.js';

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

    getPrice(sourceName: string, attributes: string) {
        const source = this.pipelineContext.bot.priceSources[sourceName];

        if (!source) {
            throw new Error(`Price source ${sourceName} not found`);
        }

        return source.getPrice(this.marketName, attributes);
    }
}
