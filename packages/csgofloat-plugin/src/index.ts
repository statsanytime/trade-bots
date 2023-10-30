import { Plugin, appendStorageItem, useContext } from '@statsanytime/trade-bots';
import Big from 'big.js';
import { createFetch } from 'ofetch';
import { CSGOFloatPluginOptions, ScheduleDepositOptions } from './types.js';

const MARKETPLACE = 'csgofloat';

class CSGOFloatPlugin implements Plugin {
    name = 'csgofloat';

    apiKey: string;

    ofetch: ReturnType<typeof createFetch>;

    constructor(options: CSGOFloatPluginOptions) {
        this.apiKey = options.apiKey;
        this.ofetch = createFetch({
            fetch: globalThis.fetch,
            Headers: globalThis.Headers,
            AbortController: globalThis.AbortController,
        });
    }
}

export async function scheduleDeposit(options: ScheduleDepositOptions) {
    const context = useContext();

    const amountUsd = new Big(options.amountUsd);

    if (!context.item?.assetId) {
        throw new Error(
            'Asset ID is not defined. Ensure a withdrawal has been made and awaited.',
        );
    }

    await appendStorageItem('scheduled-deposits', {
        marketplace: MARKETPLACE,
        withdrawMarketplace: context.marketplace,
        amountUsd: amountUsd.round(2).toNumber(),
        assetId: context.item.assetId,
    });
}

export function createCSGOFloatPlugin(options: CSGOFloatPluginOptions) {
    return new CSGOFloatPlugin(options);
}
