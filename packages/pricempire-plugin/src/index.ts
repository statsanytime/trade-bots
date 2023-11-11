import {
    useContext,
    type Plugin,
    SilentError,
    storage,
} from '@statsanytime/trade-bots';
import consola from 'consola';
import Big from 'big.js';
import get from 'lodash/get.js';
import { createFetch } from 'ofetch';
import dayjs from 'dayjs';
import { PricempirePluginOptions } from './types.js';

class PricempirePlugin implements Plugin {
    name: string = 'pricempire';

    apiKey: string;

    version: 'v2' | 'v3';

    prices: Record<string, unknown> = {};

    sources: string[];

    ofetch: ReturnType<typeof createFetch>;

    constructor(options: PricempirePluginOptions) {
        this.apiKey = options.apiKey;
        this.version = options.version || 'v3';
        this.sources = options.sources;
        this.ofetch = createFetch();
    }

    async boot() {
        // Automatically fetch prices once an hour
        setInterval(
            () => {
                this.fetchPrices();
            },
            1000 * 60 * 60,
        );

        if (await storage.hasItem('pricempire-prices')) {
            const storedData = (await storage.getItem('pricempire-prices')) as {
                prices: Record<string, unknown>;
                cachedAt: number;
            };

            // Only use cache for 1 hour
            if (
                dayjs(storedData.cachedAt).isAfter(dayjs().subtract(1, 'hour'))
            ) {
                this.prices = storedData.prices;
                return;
            }
        }

        await this.fetchPrices();
    }

    async fetchPrices() {
        try {
            this.prices = await this.ofetch(
                `https://api.pricempire.com/${this.version}/items/prices`,
                {
                    params: {
                        api_key: this.apiKey,
                        sources: this.sources,
                    },
                },
            );

            await storage.setItem('pricempire-prices', {
                prices: this.prices,
                cachedAt: Date.now(),
            });
        } catch (e) {
            consola.log(e);
            consola.error('Failed to fetch prices from Pricempire', e);
        }
    }
}

export function getPrice(attributes: string) {
    const context = useContext();
    const plugin = context.bot.plugins['pricempire'] as PricempirePlugin;
    const item = context.item!;

    const price = get(
        plugin.prices,
        `${item.marketName}.${attributes}.price`,
    ) as number | undefined;

    if (!price) {
        return undefined;
    }

    return new Big(price).div(100).toNumber();
}

export function getPricePercentage(attributes: string) {
    const context = useContext();

    const targetPrice = getPrice(attributes);
    const itemPrice = context.item!.priceUsd;

    if (!targetPrice) {
        throw new SilentError(
            `Failed to get pricempire price ${attributes} for item ${
                context.item!.marketName
            }`,
        );
    }

    return new Big(itemPrice).div(targetPrice).times(100).toNumber();
}

export function createPricempirePlugin(options: PricempirePluginOptions) {
    return new PricempirePlugin(options);
}
