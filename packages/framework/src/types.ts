import { Dayjs } from 'dayjs';
import { Bot, Item } from './index.js';

export interface BotOptions {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Plugin[];
}

export interface ItemOptions {
    marketName: string;
    marketId: string | number;
    priceUsd: number;
    assetId?: string;
}

export interface Pipeline {
    name: string;
    handler: () => void;
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
    withdrawnAt?: Dayjs;
}

export interface PipelineListenHook {
    event: string;
    handler: (event: any) => void;
}

export interface ScheduleDepositOptions {
    marketplace: string;
    withdrawMarketplace: string;
    amountUsd: number;
    assetId: string;
    marketplaceData?: Record<string, any>;
    withdrawnAt: string;
}

export interface ScheduledDeposit extends ScheduleDepositOptions {
    //
}
