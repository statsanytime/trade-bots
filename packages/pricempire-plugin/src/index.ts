import { useContext, type Plugin } from '@statsanytime/trade-bots';
import consola from 'consola';
import get from 'lodash/get';
import { createFetch } from 'ofetch';
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

    return price / 100;
}

export function createPricempirePlugin(options: PricempirePluginOptions) {
    return new PricempirePlugin(options);
}
