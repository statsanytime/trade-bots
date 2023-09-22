import { Marketplace } from "./marketplaces/types";

export type ListenableEvents = 'csgoempire:item-buyable';

export interface Bot {
    name: string;
    pipeline: Pipeline;
    marketplaces: Marketplace[];
}

export interface Pipeline {
    name: string;
    handler: () => void;
}

export interface ScheduleDepositOptions {
    amountUsd: number;
}

export interface PipelineItem {
    name: string;
    marketName: string;
    marketId: string | number;
}
