import { Marketplaces, parseEvent } from './marketplaces/index.js';
import type { Marketplace, MarketplaceName } from './marketplaces/types.js';
import type { Bot, ListenableEvents, Pipeline, PipelineContextEvent, ScheduleDepositOptions } from './types.js';

export class PipelineContext {
    bot: Bot;
    marketplaces: Record<string, Marketplace>;

    constructor(bot: Bot) {
        this.bot = bot;
        this.marketplaces = {};
    }

    resolveMarketplace(marketplace: MarketplaceName) {
        if (!this.marketplaces[marketplace]) {
            this.marketplaces[marketplace] = new Marketplaces[marketplace](this.bot);
        }

        return this.marketplaces[marketplace];
    }

    listen(event: ListenableEvents, handler: () => void) {
        const { marketplaceName, marketplaceEvent } = parseEvent(event);
        const marketplace = this.resolveMarketplace(marketplaceName);

        const nestedContext = new PipelineEventContext(this, {
            marketplace: marketplaceName,
        });

        marketplace.listen(nestedContext, marketplaceEvent, handler);
    }
}

export class PipelineEventContext extends PipelineContext {
    event: PipelineContextEvent;

    constructor(parent: PipelineContext, event: PipelineContextEvent) {
        super(parent.bot);

        this.marketplaces = parent.marketplaces;
        this.event = event;
    }

    async withdraw() {
        const marketplace = this.resolveMarketplace(this.event.marketplace);

        const nestedContext = new PipelineWithdrawContext(this);

        await marketplace.withdraw(nestedContext);
    }
}

export class PipelineWithdrawContext extends PipelineEventContext {
    constructor(parent: PipelineEventContext) {
        super(parent, parent.event);
    }

    async scheduleDeposit(marketplace: MarketplaceName, options: ScheduleDepositOptions) {
        console.log(`Scheduled deposit of ${options.amountUsd} USD to ${marketplace}`);
    }
}

export function createPipeline(name: string, handler: () => void): Pipeline {
    return {
        name,
        handler,
    };
}
