import { Bot, type Plugin } from '@statsanytime/trade-bots';
import { CSGOEmpireMarketplace } from './marketplace.js';
import { CSGOEmpirePluginOptions } from './types.js';

class CSGOEmpirePlugin implements Plugin {
    options: CSGOEmpirePluginOptions;

    constructor(options: CSGOEmpirePluginOptions) {
        this.options = options;
    }

    boot(bot: Bot) {
        bot.registerMarketplace(
            'csgoempire',
            new CSGOEmpireMarketplace(this.options),
        );
    }
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}
