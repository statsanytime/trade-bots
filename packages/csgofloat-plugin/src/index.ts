import {
    Deposit,
    Plugin,
    ScheduledDeposit,
    appendStorageItem,
    scheduleDeposit as frameworkScheduleDeposit,
    useContext,
    removeScheduledDeposit,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import { createFetch } from 'ofetch';
import consola from 'consola';
import pickBy from 'lodash/pickBy.js';
import {
    CSGOFloatPluginOptions,
    CSGOFloatScheduleDepositOptions,
} from './types.js';

const MARKETPLACE = 'csgofloat';

class CSGOFloatPlugin implements Plugin {
    name = 'csgofloat';

    apiKey: string;

    version: 'v1';

    ofetch: ReturnType<typeof createFetch>;

    constructor(options: CSGOFloatPluginOptions) {
        this.apiKey = options.apiKey;
        this.version = options.version ?? 'v1';
        this.ofetch = createFetch();
    }

    boot() {
        const context = useContext();

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

    const deposit = new Deposit({
        marketplace: MARKETPLACE,
        marketplaceId: depositRes.id,
        amountUsd: scheduledDeposit.amountUsd,
        item: {
            ...context.item!,
            priceUsd: scheduledDeposit.amountUsd,
        },
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

export function createCSGOFloatPlugin(options: CSGOFloatPluginOptions) {
    return new CSGOFloatPlugin(options);
}
