import {
    Bot,
    PipelineItemContext,
    Item,
    PipelineContext,
} from '@statsanytime/trade-bots';
import { CSGOEmpire } from 'csgoempire-wrapper';
import {
    CSGOEmpireNewItemEvent,
    CSGOEmpireTradeStatus,
    CSGOEmpireTradeStatusEvent,
} from './types.js';

export class CSGOEmpirePipelineItemContext extends PipelineItemContext {
    event: CSGOEmpireNewItemEvent;
    account: CSGOEmpire;

    constructor({
        parent,
        item,
        event,
        account,
    }: {
        parent: PipelineContext;
        item: Item;
        event: CSGOEmpireNewItemEvent;
        account: CSGOEmpire;
    }) {
        super({ parent, item });

        this.event = event;
        this.account = account;
    }

    withdraw(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!this.event) {
                return reject("Event is not defined. This should'nt happen.");
            }

            const promises = [
                this.awaitTradeStatus(
                    this.event.id,
                    CSGOEmpireTradeStatus.Completed,
                ),
                this.bot.hasPlugin('steam')
                    ? this.awaitOfferAccepted(this.bot, this.item.marketName)
                    : null,
            ].filter((promise) => promise);

            Promise.all(promises)
                .then(([tradeStatusEvent, assetId]) => {
                    this.item.assetId = assetId as string;

                    resolve();
                })
                .catch(reject);

            this.account.makeWithdrawal(this.event.id);
        });
    }

    getMarketplace(): string {
        return 'csgoempire';
    }

    private awaitOfferAccepted(bot: Bot, itemName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            bot.hooks.hook('steam:offer-accepted', (offer) => {
                const matchingItem = offer.itemsToReceive.find(
                    (item: any) => item.market_hash_name === itemName,
                );

                if (matchingItem) {
                    resolve(matchingItem.assetid);
                }
            });
        });
    }

    private awaitTradeStatus(
        itemId: number,
        status: CSGOEmpireTradeStatus,
    ): Promise<CSGOEmpireTradeStatusEvent> {
        return new Promise((resolve, reject) => {
            const tradeStatusListener = this.account.tradingSocket.on(
                'trade_status',
                (event: CSGOEmpireTradeStatusEvent) => {
                    // Ignore events for other items
                    if (event.data.item_id !== itemId) {
                        return;
                    }

                    // Completed
                    if (event.data.status === status) {
                        this.account.tradingSocket.off(
                            'trade_status',
                            tradeStatusListener,
                        );

                        resolve(event);
                    }

                    // Error
                    if (event.data.status === CSGOEmpireTradeStatus.Error) {
                        this.account.tradingSocket.off(
                            'trade_status',
                            tradeStatusListener,
                        );

                        reject('CSGOEmpire trade errored out.');
                    }
                },
            );
        });
    }
}
