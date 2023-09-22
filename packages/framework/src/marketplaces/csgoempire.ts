import { CSGOEmpire } from 'csgoempire-wrapper';
import type { CSGOEmpireItem } from './csgoempire.types.js';
import type { MarketplaceEvent } from './types.js';
import { PipelineItemContext } from '../pipelines.js';

interface CSGOEmpireMarketplaceOptions {
    apiKey: string;
}

export class CSGOEmpireMarketplace {
    account: CSGOEmpire;

    constructor(options: CSGOEmpireMarketplaceOptions) {
        this.account = new CSGOEmpire(options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account.tradingSocket.emit('filters', {});
        });
    }

    listen(pipelineContext: PipelineItemContext, ListenableEvents: MarketplaceEvent, handler: Function) {
        switch (ListenableEvents) {
            case 'item-buyable':
                this.account.tradingSocket.on('new_item', (item: CSGOEmpireItem) => {
                    pipelineContext.item = item;

                    handler.call(pipelineContext, item);
                });
        }
    }

    withdraw(pipelineContext: PipelineItemContext) {
        if (!pipelineContext.item) {
            throw new Error('Item is not defined.');
        }

        return this.account.makeWithdrawal(pipelineContext.item.id);
    }
};
