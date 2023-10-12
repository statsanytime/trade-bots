import consola from 'consola';
import get from 'lodash/get';
import { createFetch } from 'ofetch';
import type { PricempirePluginOptions } from './types.js';

export class PricempirePriceSource {
    apiKey: string;
    version: 'v2' | 'v3';
    prices: Record<string, unknown> = {};
    sources: string[];
    ofetch: ReturnType<typeof createFetch>;

    static name: string = 'pricempire';

    constructor(options: PricempirePluginOptions) {
        this.apiKey = options.apiKey;
        this.version = options.version || 'v3';
        this.sources = options.sources;
        this.ofetch = createFetch({
            fetch: globalThis.fetch,
            Headers: globalThis.Headers,
            AbortController: globalThis.AbortController,
        });

        this.fetchPrices();
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
        } catch (e) {
            console.log(e);
            consola.error('Failed to fetch prices from Pricempire', e);
        }
    }

    getPrice(marketName: string, attributes: string) {
        const price = get(this.prices, `${marketName}.${attributes}.price`) as
            | number
            | undefined;

        if (!price) {
            return undefined;
        }

        return price / 100;
    }
}
