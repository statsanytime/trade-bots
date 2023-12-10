import {
    Item,
    useContext,
    type Plugin,
    ScheduledDeposit,
    removeScheduledDeposit,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import consola from 'consola';
import { CSGOEmpire } from 'csgoempire-wrapper';
import { CSGOEmpirePluginOptions } from './types.js';
import { deposit } from './deposit.js';

const USD_TO_COINS_RATE = 1.62792;

export const MARKETPLACE = 'csgoempire';

export function coinsToUsd(coins: number) {
    return new Big(coins).div(USD_TO_COINS_RATE).toNumber();
}

export function usdToCoins(usd: number) {
    return new Big(usd).times(USD_TO_COINS_RATE).toNumber();
}

export class CSGOEmpirePlugin implements Plugin {
    name = 'csgoempire';

    options: CSGOEmpirePluginOptions;

    account: CSGOEmpire | null;

    withdrawalItems: Record<number, Item> = {};

    constructor(options: CSGOEmpirePluginOptions) {
        this.options = options;
        this.account = null;
    }

    boot() {
        const context = useContext();

        this.account = new CSGOEmpire(this.options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account!.tradingSocket.emit('filters', {});
        });

        context.bot.hooks.hook(
            'deposit-redepositable',
            async (depositObject: ScheduledDeposit) => {
                if (depositObject.marketplace !== MARKETPLACE) {
                    return;
                }

                try {
                    await deposit(depositObject);
                    await removeScheduledDeposit(depositObject);
                } catch (err) {
                    consola.error(err);
                    consola.error('Failed to deposit item', depositObject);
                }
            },
        );
    }
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}

export * from './listeners.js';
export * from './withdraw.js';
export * from './deposit.js';
