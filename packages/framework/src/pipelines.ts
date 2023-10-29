import { Bot } from './index.js';
import { Item } from './item.js';
import type { Pipeline, ScheduleDepositOptions } from './types.js';
import { appendStorageItem } from './storage.js';

export class PipelineContext {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    listen(
        event: string,
        handler: (this: PipelineItemContext, event: any) => void,
    ) {
        this.bot.hooks.callHook('pipeline:listen', {
            event,
            handler,
            context: this,
        });
    }
}

export abstract class PipelineItemContext extends PipelineContext {
    item: Item;

    constructor({ parent, item }: { parent: PipelineContext; item: Item }) {
        super(parent.bot);

        this.item = item;
    }

    abstract withdraw(): Promise<void>;

    async scheduleDeposit(
        marketplace: string,
        options: ScheduleDepositOptions,
    ) {
        if (!this.item.assetId) {
            throw new Error(
                'Asset ID is not defined. Ensure a withdrawal has been made and awaited.',
            );
        }

        await appendStorageItem('scheduled-deposits', {
            marketplace,
            withdrawMarketplace: this.getMarketplace(),
            amountUsd: options.amountUsd,
            assetId: this.item.assetId,
        });
    }

    abstract getMarketplace(): string;
}

export function createPipeline(
    name: string,
    handler: (this: PipelineContext) => void,
): Pipeline {
    return {
        name,
        handler,
    };
}
