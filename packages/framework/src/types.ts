import { Dayjs } from 'dayjs';
import { Bot, Item, Withdrawal } from './index.js';
import { type Storage } from 'unstorage';

export interface BotOptions {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Plugin[];
    storage?: Storage;
}

export interface ItemOptions {
    marketName: string;
    marketId: string | number;
    priceUsd: number;
    assetId?: string;
}

export interface Pipeline {
    name: string;
    handler: () => void | Promise<void>;
}

export interface Plugin {
    name: string;
    boot?: () => void;
}

export interface PipelineContext {
    bot: Bot;
    item?: Item;
    marketplace?: string;
    event?: any;
    withdrawal?: Withdrawal;
}

export interface ScheduleDepositOptions {
    marketplace: string;
    withdrawMarketplace: string;
    amountUsd: number;
    assetId: string;
    marketplaceData?: Record<string, any>;
    withdrawalId: string;
}

export interface ScheduledDeposit extends ScheduleDepositOptions {
    //
}

export interface CreateTradeOptions {
    marketplace: string;
    marketplaceId: string;
    amountUsd: number;
    marketplaceData?: Record<string, any>;
    item: Item;
}
