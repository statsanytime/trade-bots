import { Bot, PipelineContext, PipelineItemContext } from './index.js';

export interface BotOptions {
    name: string | undefined;
    pipeline: Pipeline;
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
    name: string;
    boot: (bot: Bot) => void;
}

export interface PipelineListenHook {
    event: string;
    handler: (this: PipelineItemContext, event: any) => void;
    context: PipelineContext;
}
