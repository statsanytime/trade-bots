import { CSGOEmpire } from 'csgoempire-wrapper';
import type { CSGOEmpireNewItemEvent } from './csgoempire.types.js';
import type { MarketplaceEvent } from './types.js';
import { PipelineItemContext } from '../pipelines.js';
import { Item } from '../item.js';

interface CSGOEmpireMarketplaceOptions {
    apiKey: string;
}

export class CSGOEmpireMarketplace {
    USD_TO_COINS_RATE = 1.62792;

    account: CSGOEmpire;

    constructor(options: CSGOEmpireMarketplaceOptions) {
        this.account = new CSGOEmpire(options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account.tradingSocket.emit('filters', {});
        });
    }

    listen(
        pipelineContext: PipelineItemContext,
        ListenableEvents: MarketplaceEvent,
        handler: (...args: unknown[]) => void,
    ) {
        switch (ListenableEvents) {
            case 'item-buyable':
                this.account.tradingSocket.on(
                    'new_item',
                    (event: CSGOEmpireNewItemEvent) => {
                        const item = new Item({
                            pipelineContext,
                            marketId: event.id,
                            marketName: event.market_name,
                            priceUsd: this.coinsToUsd(event.market_value / 100),
                        });

                        pipelineContext.item = item;
                        pipelineContext.event = event;

                        handler.call(pipelineContext, item);
                    },
                );
        }
    }

    withdraw(pipelineContext: PipelineItemContext) {
        if (!pipelineContext.event) {
            throw new Error('Event is not defined.');
        }

        return this.account.makeWithdrawal(pipelineContext.event.id);
    }

    coinsToUsd(coins: number) {
        return coins / this.USD_TO_COINS_RATE;
    }
}
