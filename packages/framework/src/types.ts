import { MarketplaceName } from "./marketplaces/types";

export type ListenableEvents = 'csgoempire:item-buyable';

export interface Bot {
    name: string;
    pipeline: Pipeline;
    marketplaces: {
        csgoempire?: {
            apiKey: string;
        };
    };
}

export interface Pipeline {
    name: string;
    handler: () => void;
}

export interface PipelineContextEvent {
    [key: string]: any;
    marketplace: MarketplaceName;
}

export interface ScheduleDepositOptions {
    amountUsd: number;
}
