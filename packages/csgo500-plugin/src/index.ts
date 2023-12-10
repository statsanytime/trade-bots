import {
    Plugin,
    SilentError,
    useContext,
    createWithdrawal,
    getContext,
    Withdrawal,
} from '@statsanytime/trade-bots';
import { createFetch } from 'ofetch';
import io, { Socket } from 'socket.io-client-v4';
import jwt from 'jsonwebtoken';
import type {
    CSGO500Listing,
    CSGO500MarketListingAuctionUpdateEvent,
    CSGO500MarketListingUpdateEvent,
    CSGO500PluginOptions,
} from './types.js';
import Big from 'big.js';

const BUX_TO_USD_RATE = 1666;

export function buxToUsd(bux: number) {
    return new Big(bux).div(BUX_TO_USD_RATE).toNumber();
}

export function usdToBux(usd: number) {
    return new Big(usd).times(BUX_TO_USD_RATE).round(0).toNumber();
}

export const MARKETPLACE = 'csgo500';

export class CSGO500Plugin implements Plugin {
    name = 'csgo500';

    apiKey: string;

    userId: string;

    ofetch: ReturnType<typeof createFetch>;

    socket?: Socket;

    constructor(options: CSGO500PluginOptions) {
        this.apiKey = options.apiKey;
        this.userId = options.userId;
        this.ofetch = createFetch();
    }

    get authToken() {
        return jwt.sign({ userId: this.userId }, this.apiKey);
    }

    boot() {
        this.socket = io('wss://tradingapi.500.casino', {
            transports: ['websocket'],
            secure: true,
            auth: {
                'x-500-auth': this.authToken,
            },
        });
    }
}

async function withdrawAuction() {
    const contextObject = getContext();
    const context = useContext();

    const plugin = context.bot.plugins['csgo500'] as CSGO500Plugin;
    const listing = context.event.listing as CSGO500Listing;

    return new Promise<Withdrawal>((resolve, reject) => {
        const cancelListeners = () => {
            plugin.socket?.off('market_listing_update', handleListingUpdate);
            plugin.socket?.off(
                'market_listing_auction_update',
                handleAuctionUpdate,
            );
        };

        const handleListingUpdate = (
            event: CSGO500MarketListingUpdateEvent,
        ) => {
            if (event.listing.id !== listing.id) {
                return;
            }

            // If it's marked as requested (sold I believe), then we can consider it withdrawn
            if (event.listing.status === 4) {
                contextObject.call(context, async () => {
                    const withdrawal = await createWithdrawal({
                        marketplaceId: listing.id,
                    });

                    cancelListeners();

                    resolve(withdrawal);
                });
            }
        };

        const handleAuctionUpdate = (
            event: CSGO500MarketListingAuctionUpdateEvent,
        ) => {
            if (event.listing.id !== context.item!.marketId) {
                return;
            }

            const newHighestBidUsd = new Big(
                buxToUsd(event.listing.auctionHighestBidValue!),
            )
                .round(2)
                .toNumber();

            // If there's an auction update for a bid higher than ours, we can assume our bid was outbid
            // We add a 0.5% margin to the price to prevent rounding errors, as the minimum bid increment is 1%
            if (newHighestBidUsd > context.item!.priceUsd * 1.005) {
                cancelListeners();

                reject(new SilentError('Bid was outbid by another user.'));
            }
        };

        plugin.socket?.on('market_listing_update', handleListingUpdate);
        plugin.socket?.on('market_listing_auction_update', handleAuctionUpdate);

        plugin
            .ofetch('https://tradingapi.500.casino/api/v1/market/auction/bid', {
                method: 'POST',
                body: {
                    listingId: listing.id,
                    bidValue: usdToBux(context.item!.priceUsd),
                    selectedBalance: 'bux',
                },
            })
            .catch((err) => {
                reject(new SilentError('Failed to withdraw item', err));
            });
    });
}

async function withdrawNormal() {
    const context = useContext();

    const plugin = context.bot.plugins['csgo500'] as CSGO500Plugin;
    const listing = context.event.listing as CSGO500Listing;

    try {
        const withdrawRes = await plugin.ofetch(
            'https://tradingapi.500.casino/api/v1/market/withdraw',
            {
                method: 'POST',
                body: {
                    listingId: listing.id,
                    listingValue: listing.value,
                    selectedBalance: 'bux',
                },
            },
        );

        const withdrawal = await createWithdrawal({
            marketplaceId: withdrawRes.data.listing.id.toString(),
        });

        return withdrawal;
    } catch (err) {
        throw new SilentError('Failed to withdraw item', err);
    }
}

export async function withdraw() {
    const context = useContext();

    const withdrawal = context.item?.isAuction
        ? await withdrawAuction()
        : await withdrawNormal();

    context.withdrawal = withdrawal;

    return withdrawal;
}

export function createCSGO500Plugin(options: CSGO500PluginOptions) {
    return new CSGO500Plugin(options);
}

export * from './listeners.js';
