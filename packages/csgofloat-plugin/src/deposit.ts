import {
    Deposit,
    ScheduledDeposit,
    appendStorageItem,
    scheduleDeposit as frameworkScheduleDeposit,
    useContext,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import pickBy from 'lodash/pickBy.js';
import { CSGOFloatScheduleDepositOptions } from './types.js';
import { CSGOFloatPlugin, MARKETPLACE } from './index.js';

export async function deposit(scheduledDeposit: ScheduledDeposit) {
    const context = useContext();
    const plugin = context.bot.plugins['csgofloat'] as CSGOFloatPlugin;

    const amountCents = new Big(scheduledDeposit.amountUsd)
        .times(100)
        .toNumber();

    const depositRes = await plugin.ofetch(
        `https://csgofloat.com/api/${plugin.version}/listings`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: plugin.apiKey,
            },
            body: JSON.stringify({
                ...(scheduledDeposit.marketplaceData ?? {}),
                asset_id: scheduledDeposit.assetId,
                price: amountCents,
            }),
        },
    );

    const newItem = structuredClone(context.item!);
    newItem.priceUsd = scheduledDeposit.amountUsd;

    const deposit = new Deposit({
        marketplace: MARKETPLACE,
        marketplaceId: depositRes.id,
        amountUsd: scheduledDeposit.amountUsd,
        item: newItem,
    });

    await appendStorageItem(context.bot.storage, 'deposits', deposit);

    return deposit;
}

export async function scheduleDeposit(
    options: CSGOFloatScheduleDepositOptions,
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

    const marketplaceData = pickBy(
        {
            type: options.type,
            maxOfferDiscount: options.maxOfferDiscount,
            reservePrice: options.reservePrice,
            durationDays: options.durationDays,
            description: options.description,
            private: options.private,
        },
        (v) => v !== undefined,
    );

    await frameworkScheduleDeposit({
        marketplaceData,
        marketplace: MARKETPLACE,
        withdrawMarketplace: context.marketplace!,
        amountUsd: amountUsd.round(2).toNumber(),
        assetId: context.item.assetId,
        withdrawalId: context.withdrawal.id,
    });
}
