import { appendStorageItem, useContext } from '@statsanytime/trade-bots';
import Big from 'big.js';
import { ScheduleDepositOptions } from './types.js';

const MARKETPLACE = 'csgofloat';

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
