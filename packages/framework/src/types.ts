import { CSGOEmpireNewItemEvent } from './marketplaces/csgoempire.types.js';
import { Marketplace } from './marketplaces/types.js';
import { PriceSource } from './priceSources/types.js';

export type ListenableEvents = 'csgoempire:item-buyable';

export interface Bot {
    name: string;
    pipeline: Pipeline;
    marketplaces: Marketplace[];
    priceSources: PriceSource[];
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

export type PipelineEvent = CSGOEmpireNewItemEvent;
