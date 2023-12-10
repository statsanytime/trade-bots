import { Item, getContext, handleError } from '@statsanytime/trade-bots';
import {
    CSGO500MarketListingAuctionUpdateEvent,
    CSGO500MarketListingUpdateEvent,
} from './types';
import { CSGO500Plugin, MARKETPLACE, buxToUsd } from '.';

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
            const item = new Item({
                marketId: event.listing.id,
                marketName: event.listing.name,
                priceUsd: buxToUsd(event.listing.value),
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
