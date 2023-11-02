import {
    Bot,
    PipelineContext,
    Plugin,
    ScheduledDeposit,
    depositIsTradable,
    scheduleDeposit as frameworkScheduleDeposit,
    getContext,
    getScheduledDeposits,
    useContext,
} from '@statsanytime/trade-bots';
import Big from 'big.js';
import { createFetch } from 'ofetch';
import dayjs from 'dayjs';
import consola from 'consola';
import pickBy from 'lodash/pickBy';
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

        setInterval(
            () => this.checkScheduledDeposits(context.bot),
            1000 * 60 * 5,
        );
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
            for (const depositObject of toDeposit) {
                try {
                    await deposit(depositObject);
                } catch (err) {
                    consola.error(err);
                    consola.error('Failed to deposit item', depositObject);
                }
            }
        });
    }
}

export function deposit(deposit: ScheduledDeposit) {
    const context = useContext();
    const plugin = context.bot.plugins['csgofloat'] as CSGOFloatPlugin;

    const amountCents = new Big(deposit.amountUsd).times(100).toNumber();

    return plugin.ofetch(
        `https://csgofloat.com/api/${plugin.version}/listings`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: plugin.apiKey,
            },
            body: JSON.stringify({
                ...(deposit.marketplaceData ?? {}),
                asset_id: deposit.assetId,
                price: amountCents,
            }),
        },
    );
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
        withdrawnAt: context.withdrawnAt!.toISOString(),
    });
}

export function createCSGOFloatPlugin(options: CSGOFloatPluginOptions) {
    return new CSGOFloatPlugin(options);
}
