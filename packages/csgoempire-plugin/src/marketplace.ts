import { CSGOEmpire } from 'csgoempire-wrapper';
import { PipelineItemContext, Item } from '@statsanytime/trade-bots';
import {
    CSGOEmpireTradeStatus,
    type CSGOEmpireNewItemEvent,
    type CSGOEmpirePluginOptions,
    type CSGOEmpireTradeStatusEvent,
} from './types.js';

export class CSGOEmpireMarketplace {
    USD_TO_COINS_RATE = 1.62792;

    account: CSGOEmpire;

    static name: string = 'csgoempire';

    constructor(options: CSGOEmpirePluginOptions) {
        this.account = new CSGOEmpire(options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account.tradingSocket.emit('filters', {});
        });
    }

    listen(
        pipelineContext: PipelineItemContext,
        listenableEvents: string,
        handler: (...args: any[]) => void,
    ) {
        switch (listenableEvents) {
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
                break;
            case 'trade-status':
                this.account.tradingSocket.on(
                    'trade_status',
                    (event: CSGOEmpireTradeStatusEvent) => {
                        handler.call(pipelineContext, event);
                    },
                );
                break;
        }
    }

    withdraw(pipelineContext: PipelineItemContext): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!pipelineContext.event) {
                return reject("Event is not defined. This should'nt happen.");
            }

            // Wait for the trade to be sent, and then send the withdrawal sent hook and resolve the promise.
            this.listen(
                pipelineContext,
                'trade-status',
                async (event: CSGOEmpireTradeStatusEvent) => {
                    // Ignore events for other items
                    if (
                        !pipelineContext.event ||
                        event.data.item_id !== pipelineContext.event.id
                    ) {
                        return;
                    }

                    // Completed
                    if (event.data.status === CSGOEmpireTradeStatus.Completed) {
                        resolve();
                    }

                    // Error
                    if (event.data.status === CSGOEmpireTradeStatus.Error) {
                        reject('CSGOEmpire trade errored out.');
                    }
                },
            );

            this.account.makeWithdrawal(pipelineContext.event.id);
        });
    }

    coinsToUsd(coins: number) {
        return coins / this.USD_TO_COINS_RATE;
    }
}
