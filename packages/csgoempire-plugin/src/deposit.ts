import {
    useContext,
    scheduleDeposit as frameworkScheduleDeposit,
    ScheduledDeposit,
    Deposit,
    appendStorageItem,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import consola from 'consola';
import { CSGOEmpire } from 'csgoempire-wrapper';
import {
    CSGOEmpireDepositStatus,
    CSGOEmpireScheduleDepositOptions,
    CSGOEmpireTradeStatus,
    CSGOEmpireTradeStatusEvent,
} from './types.js';
import chunk from 'lodash/chunk.js';
import { CSGOEmpirePlugin, MARKETPLACE, usdToCoins } from './index.js';

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

        if (depositItems.length === 0) {
            reject(new Error('No deposit items were found in inventory'));
        }

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
