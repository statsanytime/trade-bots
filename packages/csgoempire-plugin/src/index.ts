import {
    Item,
    getContext,
    useContext,
    scheduleDeposit as frameworkScheduleDeposit,
    type Plugin,
    handleError,
    SilentError,
    ScheduledDeposit,
    createWithdrawal,
    Deposit,
    appendStorageItem,
    removeScheduledDeposit,
    Withdrawal,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import consola from 'consola';
import { CSGOEmpire } from 'csgoempire-wrapper';
import {
    CSGOEmpireAuctionUpdateEvent,
    CSGOEmpireDepositStatus,
    CSGOEmpireNewItemEvent,
    CSGOEmpirePluginOptions,
    CSGOEmpireScheduleDepositOptions,
    CSGOEmpireTradeStatus,
    CSGOEmpireTradeStatusEvent,
} from './types.js';
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

function depositChunk(
    marketplaceInventory: Awaited<ReturnType<CSGOEmpire['getInventory']>>,
    deposits: ScheduledDeposit[],
) {
    return new Promise(async (resolve, reject) => {
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

        await plugin.account!.makeDeposits(depositItems);

        const depositObjects: Deposit[] = [];

        // We need to wait for the trade_status event to be emitted since the deposits aren't actually made until then...
        plugin.account!.tradingSocket.on(
            'trade_status',
            async (event: CSGOEmpireTradeStatusEvent) => {
                if (event.type !== 'deposit') {
                    return;
                }

                if (event.data.status === CSGOEmpireTradeStatus.Confirming) {
                    // Find the deposit object that matches the event
                    const deposit = deposits.find((deposit) => {
                        return (
                            deposit.assetId ===
                            (
                                event as CSGOEmpireDepositStatus
                            ).data.item.asset_id?.toString()
                        );
                    });

                    if (!deposit) {
                        return;
                    }

                    // Create a deposit object
                    const depositObject = new Deposit({
                        marketplaceId: event.data.id.toString(),
                        marketplace: MARKETPLACE,
                        amountUsd: deposit.amountUsd,
                        item: context.item!,
                    });

                    await appendStorageItem(
                        context.bot.storage,
                        'deposits',
                        depositObject,
                    );

                    depositObjects.push(depositObject);
                }

                if (depositObjects.length === deposits.length) {
                    resolve(depositObjects);
                }
            },
        );

        // Wait at most 1 minute for the trade_status event to be emitted
        setTimeout(() => {
            reject(
                new Error(
                    'Timed out waiting for trade_status event to be emitted',
                ),
            );
        }, 60 * 1000);
    });
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

    if (!context.withdrawal) {
        throw new Error(
            'Withdrawal is not defined. Ensure a withdrawal has been made and awaited.',
        );
    }

    await frameworkScheduleDeposit({
        marketplace: MARKETPLACE,
        withdrawMarketplace: context.marketplace!,
        amountUsd: amountUsd.round(2).toNumber(),
        assetId: context.item.assetId,
        withdrawalId: context.withdrawal.id,
    });
}

async function withdrawUsingBid(): Promise<Withdrawal> {
    return new Promise(async (resolve, reject) => {
        const contextObject = getContext();
        const context = useContext();

        const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

        await plugin.account!.placeBid(
            context.item!.marketId as number,
            context.item!.priceUsd,
        );

        const cancelListeners = () => {
            plugin.account!.tradingSocket.off(
                'trade_status',
                handleTradeStatusEvent,
            );
            plugin.account!.tradingSocket.off(
                'auction_update',
                handleAuctionUpdateEvent,
            );
        };

        const handleTradeStatusEvent = async (
            events: CSGOEmpireTradeStatusEvent | CSGOEmpireTradeStatusEvent[],
        ) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                if (
                    event.type !== 'withdrawal' ||
                    event.data.id !== context.event.id
                ) {
                    return;
                }

                if (event.data.status === CSGOEmpireTradeStatus.Confirming) {
                    contextObject.call(context, async () => {
                        const withdrawal = await createWithdrawal({
                            marketplaceId: event.data.id.toString(),
                        });

                        cancelListeners();

                        resolve(withdrawal);
                    });
                }
            });
        };

        const handleAuctionUpdateEvent = (
            events:
                | CSGOEmpireAuctionUpdateEvent
                | CSGOEmpireAuctionUpdateEvent[],
        ) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                if (event.id !== context.item!.marketId) {
                    return;
                }

                // If there's an auction update for a bid higher than ours, we can assume our bid was outbid
                if (event.auction_highest_bid > context.item!.priceUsd) {
                    cancelListeners();

                    reject(new SilentError('Bid was outbid by another user.'));
                }
            });
        };

        plugin.account!.tradingSocket.on(
            'trade_status',
            handleTradeStatusEvent,
        );
        plugin.account!.tradingSocket.on(
            'auction_update',
            handleAuctionUpdateEvent,
        );
    });
}

export async function withdraw() {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    try {
        if (context.item?.isAuction) {
            return withdrawUsingBid();
        } else {
            const withdrawRes = await plugin.account!.makeWithdrawal(
                context.event.id,
            );

            const withdrawal = await createWithdrawal({
                marketplaceId: withdrawRes.data.id.toString(),
            });

            context.withdrawal = withdrawal;

            return withdrawal;
        }
    } catch (err) {
        throw new SilentError('Failed to withdraw item', err);
    }
}

export function onItemBuyable(handler: (item: Item) => void | Promise<void>) {
    const context = getContext();
    const contextData = context.use();

    const plugin = contextData.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    contextData.bot.registerListener('csgoempire:item-buyable', handler);

    plugin.account!.tradingSocket.on(
        'new_item',
        (events: CSGOEmpireNewItemEvent | CSGOEmpireNewItemEvent[]) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                const item = new Item({
                    marketId: event.id,
                    marketName: event.market_name,
                    priceUsd: coinsToUsd(event.market_value / 100),
                    auction: {
                        highestBid: event.auction_highest_bid,
                        highestBidder: event.auction_highest_bidder,
                        endsAt: event.auction_ends_at
                            ? new Date(event.auction_ends_at * 1000)
                            : null,
                        bidCount: event.auction_number_of_bids,
                    },
                });

                plugin.withdrawalItems[event.id] = item;

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

                // Clear the item from the withdrawal items after 5 minutes, as we won't need it anymore
                // Auctions end after 3 minutes, so this should be enough time
                // We might need it for something else in the future, so we might need to revisit this
                setTimeout(
                    () => {
                        delete plugin.withdrawalItems[event.id];
                    },
                    5 * 60 * 1000,
                );
            });
        },
    );

    plugin.account!.tradingSocket.on(
        'auction_update',
        (
            events:
                | CSGOEmpireAuctionUpdateEvent
                | CSGOEmpireAuctionUpdateEvent[],
        ) => {
            const eventList = Array.isArray(events) ? events : [events];

            eventList.forEach((event) => {
                const item = plugin.withdrawalItems[event.id];

                if (!item) {
                    return;
                }

                const highestBidUsd = new Big(
                    coinsToUsd(event.auction_highest_bid / 100),
                )
                    .round(2)
                    .toNumber();

                plugin.withdrawalItems[event.id].auction = {
                    highestBid: highestBidUsd,
                    highestBidder: event.auction_highest_bidder,
                    endsAt: event.auction_ends_at
                        ? new Date(event.auction_ends_at * 1000)
                        : null,
                    bidCount: event.auction_number_of_bids,
                };

                // The new price is the next bid, so 1% more than the current highest bid
                plugin.withdrawalItems[event.id].priceUsd = new Big(
                    highestBidUsd,
                )
                    .times(1.01)
                    .round(2)
                    .toNumber();

                const newContext = {
                    ...contextData,
                    item: plugin.withdrawalItems[event.id],
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
            });
        },
    );
}

export function createCSGOEmpirePlugin(options: CSGOEmpirePluginOptions) {
    return new CSGOEmpirePlugin(options);
}
