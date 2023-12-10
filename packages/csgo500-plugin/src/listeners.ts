import { Item, getContext, handleError } from '@statsanytime/trade-bots';
import {
    CSGO500MarketListingAuctionUpdateEvent,
    CSGO500MarketListingUpdateEvent,
} from './types';
import { CSGO500Plugin, MARKETPLACE, buxToUsd } from '.';
import Big from 'big.js';

export function onItemBuyable(handler: (item: Item) => void | Promise<void>) {
    const context = getContext();
    const contextData = context.use();

    const plugin = contextData.bot.plugins['csgo500'] as CSGO500Plugin;

    contextData.bot.registerListener('csgoempire:item-buyable', handler);

    if (!plugin.socket) {
        throw new Error('Socket is not connected');
    }

    plugin.socket.on(
        'market_listing_update',
        (event: CSGO500MarketListingUpdateEvent) => {
            // Ignore non-buyable listings
            if (event.listing.status !== 3) {
                return;
            }

            const item = new Item({
                marketId: event.listing.id,
                marketName: event.listing.name,
                priceUsd: buxToUsd(event.listing.value),
                auction: {
                    highestBid: event.listing.auctionHighestBidValue
                        ? buxToUsd(event.listing.auctionHighestBidValue)
                        : null,
                    highestBidder: event.listing.auctionHighestBidUserId,
                    endsAt: event.listing.auctionEndDate
                        ? new Date(event.listing.auctionEndDate)
                        : null,
                    bidCount: event.listing.auctionBidsCount,
                },
            });

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
        },
    );

    plugin.socket.on(
        'market_listing_auction_update',
        (event: CSGO500MarketListingAuctionUpdateEvent) => {
            // It should be safe to assume a bid has been placed here. If there is some other reason
            // for this event to be fired, we'll have to update this logic.
            const highestBidUsd = new Big(
                buxToUsd(event.listing.auctionHighestBidValue!),
            )
                .round(2)
                .toNumber();

            const item = new Item({
                marketId: event.listing.id,
                marketName: event.listing.name,
                priceUsd: new Big(highestBidUsd)
                    .times(1.01)
                    .round(2)
                    .toNumber(),
                auction: {
                    highestBid: highestBidUsd,
                    highestBidder: event.listing.auctionHighestBidUserId,
                    endsAt: event.listing.auctionEndDate
                        ? new Date(event.listing.auctionEndDate)
                        : null,
                    bidCount: event.listing.auctionBidsCount,
                },
            });

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
        },
    );

    // TODO: Maybe listen for market_listing_value_change too
}
