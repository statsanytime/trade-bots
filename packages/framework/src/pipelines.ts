import { Item } from './item.js';
import { Marketplaces, parseEvent } from './marketplaces/index.js';
import type { MarketplaceName } from './marketplaces/types.js';
import type {
    Bot,
    ListenableEvents,
    Pipeline,
    PipelineEvent,
    ScheduleDepositOptions,
} from './types.js';

export class PipelineContext {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    resolveMarketplace(name: MarketplaceName) {
        const marketplace = this.bot.marketplaces.find(
            (marketplace) => marketplace instanceof Marketplaces[name],
        );

        if (!marketplace) {
            throw new Error(`Marketplace ${marketplace} is not defined.`);
        }

        return marketplace;
    }

    listen(event: ListenableEvents, handler: () => void) {
        const { marketplaceName, marketplaceEvent } = parseEvent(event);
        const marketplace = this.resolveMarketplace(marketplaceName);

        const nestedContext = new PipelineItemContext(this, {
            marketplace: marketplaceName,
        });

        marketplace.listen(nestedContext, marketplaceEvent, handler);
    }
}

export class PipelineItemContext extends PipelineContext {
    marketplace: MarketplaceName;
    item?: Item;
    event?: PipelineEvent;

    constructor(
        parent: PipelineContext,
        {
            marketplace,
            item,
            event,
        }: { marketplace: MarketplaceName; item?: Item; event?: PipelineEvent },
    ) {
        super(parent.bot);

        this.marketplace = marketplace;
        this.item = item;
        this.event = event;
    }

    async withdraw() {
        const marketplace = this.resolveMarketplace(this.marketplace);

        const nestedContext = new PipelineWithdrawContext(this);

        await marketplace.withdraw(nestedContext);
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
        marketplace: MarketplaceName,
        options: ScheduleDepositOptions,
    ) {
        console.log(
            `Scheduled deposit of ${options.amountUsd} USD to ${marketplace}`,
        );
    }
}

export function createPipeline(name: string, handler: () => void): Pipeline {
    return {
        name,
        handler,
    };
}
