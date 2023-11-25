import {
    Item,
    Plugin,
    SilentError,
    getContext,
    handleError,
    useContext,
    callContextHook,
    createWithdrawal,
} from '@statsanytime/trade-bots';
import { createFetch } from 'ofetch';
import io, { Socket } from 'socket.io-client-v4';
import jwt from 'jsonwebtoken';
import type {
    CSGO500Listing,
    CSGO500MarketListingUpdateEvent,
    CSGO500PluginOptions,
} from './types.js';

const BUX_TO_USD_RATE = 1666;

function buxToUsd(bux: number) {
    return bux / BUX_TO_USD_RATE;
}

const MARKETPLACE = 'csgo500';

class CSGO500Plugin implements Plugin {
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
        const context = useContext();

        this.socket = io('wss://tradingapi.500.casino', {
            transports: ['websocket'],
            secure: true,
            auth: {
                'x-500-auth': this.authToken,
            },
        });

        context.bot.hooks.hook('pipeline:listen', (event: string) => {
            const listeners = {
                'csgo500:item-buyable': () => this.listenForItemBuyable(),
            } as Record<string, () => void>;

            if (event in listeners) {
                listeners[event]();
            }
        });
    }

    listenForItemBuyable() {
        if (!this.socket) {
            throw new Error('Socket is not connected');
        }

        const context = getContext();
        const contextData = context.use();

        this.socket.on(
            'market_listing_update',
            (event: CSGO500MarketListingUpdateEvent) => {
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
                        await callContextHook('csgo500:item-buyable', item);
                    } catch (err) {
                        handleError(err);
                    }
                });
            },
        );

        // TODO: Also listen for market_listing_auction_update
    }
}

export async function withdraw() {
    const context = useContext();

    const plugin = context.bot.plugins['csgo500'] as CSGO500Plugin;

    try {
        const listing = context.event.listing as CSGO500Listing;

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

        context.withdrawal = withdrawal;

        return withdrawal;
    } catch (err) {
        throw new SilentError('Failed to withdraw item', err);
    }
}

export function createCSGO500Plugin(options: CSGO500PluginOptions) {
    return new CSGO500Plugin(options);
}
