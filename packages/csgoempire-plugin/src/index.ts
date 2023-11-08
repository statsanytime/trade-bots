import {
    Item,
    getContext,
    useContext,
    scheduleDeposit as frameworkScheduleDeposit,
    type Plugin,
    getScheduledDeposits,
    depositIsTradable,
    handleError,
    SilentError,
    ScheduledDeposit,
    PipelineContext,
    Bot,
    callContextHook,
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
import chunk from 'lodash/chunk.js';

const USD_TO_COINS_RATE = 1.62792;

const MARKETPLACE = 'csgoempire';

function coinsToUsd(coins: number) {
    return coins / USD_TO_COINS_RATE;
}

function usdToCoins(usd: number) {
    return usd * USD_TO_COINS_RATE;
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

        context.bot.hooks.hook('pipeline:listen', (event: string) => {
            const listeners = {
                'csgoempire:item-buyable': () => this.listenForItemBuyable(),
            } as Record<string, () => void>;

            if (event in listeners) {
                listeners[event]();
            }
        });

        setInterval(
            () => this.checkScheduledDeposits(context.bot),
            1000 * 60 * 5,
        );
    }

    listenForItemBuyable() {
        const context = getContext();
        const contextData = context.use();

        this.account!.tradingSocket.on(
            'new_item',
            (events: CSGOEmpireNewItemEvent | CSGOEmpireNewItemEvent[]) => {
                const eventList = Array.isArray(events) ? events : [events];

                eventList.forEach((event) => {
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
                            await callContextHook(
                                'csgoempire:item-buyable',
                                item,
                            );
                        } catch (err) {
                            handleError(err);
                        }
                    });
                });
            },
        );

        // TODO: Also listen for auction_update
    }

    async checkScheduledDeposits(bot: Bot) {
        const deposits = await getScheduledDeposits({
            marketplace: MARKETPLACE,
        });

        const toDeposit = deposits.filter((deposit) =>
            depositIsTradable(dayjs(deposit.withdrawnAt!)),
        );

        // Create a new context for the deposit
        const context = getContext();

        const contextData: PipelineContext = { bot };

        context.call(contextData, async () => {
            await depositMultiple(toDeposit);
        });
    }
}

function depositChunk(
    marketplaceInventory: Awaited<ReturnType<CSGOEmpire['getInventory']>>,
    deposits: ScheduledDeposit[],
) {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    const depositItems = deposits
        .map((deposit) => {
            const inventoryItem = marketplaceInventory.items.find(
                (item) => item.asset_id?.toString() === deposit.assetId,
            );

            if (!inventoryItem) {
                consola.error(
                    `Failed to find item ${deposit.assetId} in CSGOEmpire inventory`,
                );
                return undefined;
            }

            const amountCoins = new Big(usdToCoins(deposit.amountUsd));

            inventoryItem.deposit_value = amountCoins.round(2).toNumber();

            return inventoryItem;
        })
        .filter(Boolean) as Awaited<
        ReturnType<CSGOEmpire['getInventory']>
    >['items'];

    return plugin.account!.makeDeposits(depositItems);
}

export async function depositMultiple(deposits: ScheduledDeposit[]) {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    const depositChunks = chunk(deposits, 20);

    const marketplaceInventory = await plugin.account!.getInventory(false);

    for (const chunk of depositChunks) {
        try {
            await depositChunk(marketplaceInventory, chunk);
        } catch (err) {
            console.error(err);
            consola.error('Failed to deposit item chunk', chunk);
        }
    }
}

export function deposit(deposit: ScheduledDeposit) {
    return depositMultiple([deposit]);
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
