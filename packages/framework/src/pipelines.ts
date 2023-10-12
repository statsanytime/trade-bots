import { Bot } from './index.js';
import { Item } from './item.js';
import type { ParsedEvent, Pipeline, ScheduleDepositOptions } from './types.js';

export function parseEvent(event: string): ParsedEvent {
    const [marketplaceName, marketplaceEvent] = event.split(':');

    if (!marketplaceName) {
        throw new Error(`Failed to find marketplace for event ${event}`);
    }

    if (!marketplaceEvent) {
        throw new Error(`Failed to parse marketplace event for event ${event}`);
    }

    return {
        marketplaceName,
        marketplaceEvent,
    };
}

export class PipelineContext {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    resolveMarketplace(name: string) {
        const marketplace = this.bot.marketplaces[name];

        if (!marketplace) {
            throw new Error(`Marketplace ${marketplace} is not defined.`);
        }

        return marketplace;
    }

    listen(
        event: string,
        handler: (
            this: PipelineItemContext | PipelineWithdrawContext,
            event: any,
        ) => void,
    ) {
        const { marketplaceName, marketplaceEvent } = parseEvent(event);
        const marketplace = this.resolveMarketplace(marketplaceName);

        const nestedContext = new PipelineItemContext(this, {
            marketplace: marketplaceName,
        });

        marketplace.listen(nestedContext, marketplaceEvent, handler);
    }
}

export class PipelineItemContext extends PipelineContext {
    marketplace: string;
    item?: Item;
    event?: any;

    constructor(
        parent: PipelineContext,
        {
            marketplace,
            item,
            event,
        }: { marketplace: string; item?: Item; event?: any },
    ) {
        super(parent.bot);

        this.marketplace = marketplace;
        this.item = item;
        this.event = event;
    }

    withdraw(): Promise<void> {
        const marketplace = this.resolveMarketplace(this.marketplace);

        const nestedContext = new PipelineWithdrawContext(this);

        return marketplace.withdraw(nestedContext);
    }
}

export class PipelineWithdrawContext extends PipelineItemContext {
    constructor(parent: PipelineItemContext) {
        super(parent, {
            marketplace: parent.marketplace,
            item: parent.item,
            event: parent.event,
        });
    }

    async scheduleDeposit(
        marketplace: string,
        options: ScheduleDepositOptions,
    ) {
        console.log(
            `Scheduled deposit of ${options.amountUsd} USD to ${marketplace}`,
        );
    }
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
