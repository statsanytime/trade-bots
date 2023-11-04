import {
    Item,
    getContext,
    useContext,
    scheduleDeposit as frameworkScheduleDeposit,
    type Plugin,
    type PipelineListenHook,
    getScheduledDeposits,
    depositIsTradable,
    handleError,
    SilentError,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import consola from 'consola';
import { CSGOEmpire } from 'csgoempire-wrapper';
import {
    CSGOEmpireNewItemEvent,
    CSGOEmpirePluginOptions,
    CSGOEmpireScheduleDepositOptions,
} from './types.js';
import dayjs from 'dayjs';

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

    boot() {
        const context = useContext();

        this.account = new CSGOEmpire(this.options.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account!.tradingSocket.emit('filters', {});
        });

        context.bot.hooks.hook(
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

        setInterval(this.checkScheduledDeposits.bind(this), 1000 * 60 * 5);
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

                context.call(newContext, async () => {
                    try {
                        await handler(item);
                    } catch (err) {
                        handleError(err);
                    }
                });
            },
        );
    }

    async checkScheduledDeposits() {
        const deposits = await getScheduledDeposits({
            marketplace: MARKETPLACE,
        });

        const toDeposit = deposits.filter((deposit) =>
            depositIsTradable(dayjs(deposit.withdrawnAt!)),
        );

        for (const deposit of toDeposit) {
            try {
                // TODO: IMPLEMENT
            } catch (err) {
                consola.error(err);
                consola.error('Failed to deposit item', deposit);
            }
        }
    }
}

export async function scheduleDeposit(
    options: CSGOEmpireScheduleDepositOptions,
) {
    const context = useContext();

    const amountUsd = new Big(options.amountUsd);

    if (!context.item?.assetId) {
        throw new Error(
            'Asset ID is not defined. Ensure a withdrawal has been made and awaited.',
        );
    }

    await frameworkScheduleDeposit({
        marketplace: MARKETPLACE,
        withdrawMarketplace: context.marketplace!,
        amountUsd: amountUsd.round(2).toNumber(),
        assetId: context.item.assetId,
        withdrawnAt: context.withdrawnAt!.toISOString(),
    });
}

export async function withdraw() {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    try {
        await plugin.account!.makeWithdrawal(context.event.id);

        context.withdrawnAt = dayjs();
    } catch (err) {
        throw new SilentError('Failed to withdraw item', err);
    }
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}
