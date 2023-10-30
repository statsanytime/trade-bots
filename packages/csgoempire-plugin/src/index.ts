import {
    Bot,
    Item,
    type Plugin,
    type PipelineListenHook,
    getContext,
    useContext,
} from '@statsanytime/trade-bots';
import { CSGOEmpire } from 'csgoempire-wrapper';
import { CSGOEmpireNewItemEvent, CSGOEmpirePluginOptions } from './types.js';

const USD_TO_COINS_RATE = 1.62792;

const MARKETPLACE = 'csgoempire';

function coinsToUsd(coins: number) {
    return coins / USD_TO_COINS_RATE;
}

class CSGOEmpirePlugin implements Plugin {
    name = 'csgoempire';

    options: CSGOEmpirePluginOptions;

    account: CSGOEmpire | null;

    constructor(options: CSGOEmpirePluginOptions) {
        this.options = options;
        this.account = null;
    }

    boot(bot: Bot) {
        this.account = new CSGOEmpire(this.options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account!.tradingSocket.emit('filters', {});
        });

        bot.hooks.hook(
            'pipeline:listen',
            ({ event, handler }: PipelineListenHook) => {
                const listeners = {
                    'csgoempire:item-buyable': () =>
                        this.listenForItemBuyable({ handler }),
                } as Record<string, () => void>;

                if (event in listeners) {
                    listeners[event]();
                }
            },
        );
    }

    listenForItemBuyable({ handler }: Omit<PipelineListenHook, 'event'>) {
        const context = getContext();
        const contextData = context.use();

        this.account!.tradingSocket.on(
            'new_item',
            (event: CSGOEmpireNewItemEvent) => {
                const item = new Item({
                    marketId: event.id,
                    marketName: event.market_name,
                    priceUsd: coinsToUsd(event.market_value / 100),
                });

                const newContext = {
                    ...contextData,
                    item,
                    event,
                    marketplace: MARKETPLACE,
                };

                context.call(newContext, function () {
                    handler(item);
                });
            },
        );
    }
}

export async function withdraw() {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    await plugin.account!.makeWithdrawal(context.event.id);
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}
