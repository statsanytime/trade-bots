import { getContext, handleError, Item } from '@statsanytime/trade-bots';
import { coinsToUsd, CSGOEmpirePlugin, MARKETPLACE } from './index.js';
import {
    CSGOEmpireAuctionUpdateEvent,
    CSGOEmpireNewItemEvent,
} from './types.js';
import Big from 'big.js';

export function onItemBuyable(handler: (item: Item) => void | Promise<void>) {
    const context = getContext();
    const contextData = context.use();

    const plugin = contextData.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    contextData.bot.registerListener('csgoempire:item-buyable', handler);

    plugin.account!.tradingSocket.on(
        'new_item',
        (events: CSGOEmpireNewItemEvent | CSGOEmpireNewItemEvent[]) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                const item = new Item({
                    marketId: event.id,
                    marketName: event.market_name,
                    priceUsd: coinsToUsd(event.market_value / 100),
                    auction: {
                        highestBid: event.auction_highest_bid,
                        highestBidder: event.auction_highest_bidder,
                        endsAt: event.auction_ends_at
                            ? new Date(event.auction_ends_at * 1000)
                            : null,
                        bidCount: event.auction_number_of_bids,
                    },
                });

                plugin.withdrawalItems[event.id] = item;

                const newContext = {
                    ...contextData,
                    item,
                    event,
                    marketplace: MARKETPLACE,
                };

                context.call(newContext, async () => {
                    try {
                        await handler(item);
                    } catch (err) {
                        handleError(err);
                    }
                });

                // Clear the item from the withdrawal items after 5 minutes, as we won't need it anymore
                // Auctions end after 3 minutes, so this should be enough time
                // We might need it for something else in the future, so we might need to revisit this
                setTimeout(
                    () => {
                        delete plugin.withdrawalItems[event.id];
                    },
                    5 * 60 * 1000,
                );
            });
        },
    );

    plugin.account!.tradingSocket.on(
        'auction_update',
        (
            events:
                | CSGOEmpireAuctionUpdateEvent
                | CSGOEmpireAuctionUpdateEvent[],
        ) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                const item = plugin.withdrawalItems[event.id];

                if (!item) {
                    return;
                }

                const highestBidUsd = new Big(
                    coinsToUsd(event.auction_highest_bid / 100),
                )
                    .round(2)
                    .toNumber();

                plugin.withdrawalItems[event.id].auction = {
                    highestBid: highestBidUsd,
                    highestBidder: event.auction_highest_bidder,
                    endsAt: event.auction_ends_at
                        ? new Date(event.auction_ends_at * 1000)
                        : null,
                    bidCount: event.auction_number_of_bids,
                };

                // The new price is the next bid, so 1% more than the current highest bid
                plugin.withdrawalItems[event.id].priceUsd = new Big(
                    highestBidUsd,
                )
                    .times(1.01)
                    .round(2)
                    .toNumber();

                const newContext = {
                    ...contextData,
                    item: plugin.withdrawalItems[event.id],
                    event,
                    marketplace: MARKETPLACE,
                };

                context.call(newContext, async () => {
                    try {
                        await handler(item);
                    } catch (err) {
                        handleError(err);
                    }
                });
            });
        },
    );
}
