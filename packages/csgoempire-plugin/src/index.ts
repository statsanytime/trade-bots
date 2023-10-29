import {
    Bot,
    type Plugin,
    type PipelineListenHook,
    Item,
} from '@statsanytime/trade-bots';
import { CSGOEmpire } from 'csgoempire-wrapper';
import { CSGOEmpireNewItemEvent, CSGOEmpirePluginOptions } from './types.js';
import { CSGOEmpirePipelineItemContext } from './pipeline.js';

class CSGOEmpirePlugin implements Plugin {
    name = 'csgoempire';

    USD_TO_COINS_RATE = 1.62792;

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
            ({ event, handler, context }: PipelineListenHook) => {
                const listeners = {
                    'csgoempire:item-buyable': () =>
                        this.listenForItemBuyable({
                            handler,
                            context,
                        }),
                } as Record<string, () => void>;

                if (event in listeners) {
                    listeners[event].call(this);
                }
            },
        );
    }

    listenForItemBuyable({
        handler,
        context,
    }: Omit<PipelineListenHook, 'event'>) {
        this.account!.tradingSocket.on(
            'new_item',
            (event: CSGOEmpireNewItemEvent) => {
                const item = new Item({
                    bot: context.bot,
                    marketId: event.id,
                    marketName: event.market_name,
                    priceUsd: this.coinsToUsd(event.market_value / 100),
                });

                const itemContext = new CSGOEmpirePipelineItemContext({
                    parent: context,
                    item,
                    event,
                    account: this.account!,
                });

                handler.call(itemContext, item);
            },
        );
    }

    coinsToUsd(coins: number) {
        return coins / this.USD_TO_COINS_RATE;
    }
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}
