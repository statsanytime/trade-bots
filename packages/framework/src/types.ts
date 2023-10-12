import { Bot } from './index.js';

export interface BotOptions {
    name: string | undefined;
    pipeline: Pipeline;
    marketplaces: Record<string, any>;
    priceSources: Record<string, any>;
    plugins: Plugin[];
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

export interface Plugin {
    boot: (bot: Bot) => void;
}

export interface ParsedEvent {
    marketplaceName: string;
    marketplaceEvent: string;
}
