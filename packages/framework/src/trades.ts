import { randomUUID } from 'crypto';
import type { CreateTradeOptions } from './types.js';
import { Item } from './item.js';
import { useContext, appendStorageItem } from './index.js';
import dayjs, { type Dayjs } from 'dayjs';

export abstract class Trade {
    id: string;
    marketplace: string;
    marketplaceId: string;
    amountUsd: number;
    marketplaceData?: Record<string, any>;
    item: Item;
    madeAt: Dayjs;

    constructor(options: CreateTradeOptions) {
        this.id = randomUUID();
        this.marketplace = options.marketplace;
        this.marketplaceId = options.marketplaceId;
        this.amountUsd = options.amountUsd;
        this.marketplaceData = options.marketplaceData;
        this.item = options.item;
        this.madeAt = dayjs();
    }
}

export class Withdrawal extends Trade {
    constructor(options: CreateTradeOptions) {
        super(options);
    }
}

export class Deposit extends Trade {
    constructor(options: CreateTradeOptions) {
        super(options);
    }
}

export async function createWithdrawal(
    options: Omit<CreateTradeOptions, 'marketplace' | 'item' | 'amountUsd'>,
) {
    const context = useContext();

    const withdrawal = new Withdrawal({
        ...options,
        marketplace: context.marketplace!,
        item: context.item!,
        amountUsd: context.item!.priceUsd,
    });

    await appendStorageItem(context.bot.storage, 'withdrawals', withdrawal);

    return withdrawal;
}

export async function getWithdrawals(): Promise<Withdrawal[]> {
    const context = useContext();

    const withdrawals = await context.bot.storage.getItem('withdrawals');

    if (!Array.isArray(withdrawals)) {
        return [];
    }

    return withdrawals;
}

export async function getWithdrawal(id: string) {
    const withdrawals = await getWithdrawals();

    return withdrawals.find((withdrawal) => withdrawal.id === id);
}
