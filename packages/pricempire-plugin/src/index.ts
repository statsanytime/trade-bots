import { Bot, type Plugin } from '@statsanytime/trade-bots';
import { PricempirePriceSource } from './priceSource.js';
import { PricempirePluginOptions } from './types.js';

class PricempirePlugin implements Plugin {
    options: PricempirePluginOptions;

    constructor(options: PricempirePluginOptions) {
        this.options = options;
    }

    boot(bot: Bot) {
        bot.registerPriceSource(
            'pricempire',
            new PricempirePriceSource(this.options),
        );
    }
}

export function createPricempirePlugin(options: PricempirePluginOptions) {
    return new PricempirePlugin(options);
}
