import {
    getContext,
    useContext,
    SilentError,
    createWithdrawal,
    Withdrawal,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import {
    CSGOEmpireAuctionUpdateEvent,
    CSGOEmpireTradeStatus,
    CSGOEmpireTradeStatusEvent,
} from './types.js';
import { CSGOEmpirePlugin, coinsToUsd, usdToCoins } from './index.js';

function withdrawUsingBid(): Promise<Withdrawal> {
    return new Promise(async (resolve, reject) => {
        const contextObject = getContext();
        const context = useContext();

        const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

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
                    event.data.item_id !== context.event.id
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

                const newHighestBidUsd = coinsToUsd(
                    new Big(event.auction_highest_bid).div(100).toNumber(),
                );

                // If there's an auction update for a bid higher than ours, we can assume our bid was outbid
                // We add a 0.5% margin to the price to prevent rounding errors, as the minimum bid increment is 1%
                if (newHighestBidUsd > context.item!.priceUsd * 1.005) {
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

        const bidCoins = new Big(usdToCoins(context.item!.priceUsd))
            .round(2)
            .toNumber();

        plugin
            .account!.placeBid(context.item!.marketId as number, bidCoins)
            .catch((err: Error) => {
                cancelListeners();

                reject(new SilentError('Failed to place bid', err));
            });
    });
}

function withdrawNormal() {
    const context = useContext();

    const plugin = context.bot.plugins['csgoempire'] as CSGOEmpirePlugin;

    return new Promise<Withdrawal>((resolve, reject) => {
        plugin
            .account!.makeWithdrawal(context.event.id)
            .then(async (withdrawRes) => {
                const withdrawal = await createWithdrawal({
                    marketplaceId: withdrawRes.data.id.toString(),
                });

                resolve(withdrawal);
            })
            .catch((err: Error) => {
                reject(new SilentError('Failed to withdraw item', err));
            });
    });
}

export async function withdraw() {
    const context = useContext();

    const withdrawal = context.item?.isAuction
        ? await withdrawUsingBid()
        : await withdrawNormal();

    context.withdrawal = withdrawal;

    return withdrawal;
}
