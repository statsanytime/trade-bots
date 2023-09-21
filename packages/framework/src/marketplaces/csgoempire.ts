import { CSGOEmpire } from 'csgoempire-wrapper';
import type { Bot } from '../types.js';
import type { CSGOEmpireItem, CSGOEmpireItemEvent } from './csgoempire.types.js';
import type { MarketplaceEvent } from './types.js';
import { PipelineEventContext } from '../pipelines.js';

export class CSGOEmpireMarketplace {
    account: CSGOEmpire;

    constructor(bot: Bot) {
        if (!bot.marketplaces.csgoempire) {
            throw new Error('CSGOEmpire marketplace is not configured.');
        }

        this.account = new CSGOEmpire(bot.marketplaces.csgoempire.apiKey, {
            connectToSocket: true,
        });

        this.account.tradingSocket.on('init', () => {
            this.account.tradingSocket.emit('filters', {});
        });
    }

    listen(pipelineContext: PipelineEventContext, ListenableEvents: MarketplaceEvent, handler: Function) {
        switch (ListenableEvents) {
            case 'item-buyable':
                this.account.tradingSocket.on('new_item', (item: CSGOEmpireItem) => {
                    pipelineContext.event.item = item;

                    handler.call(pipelineContext, item);
                });
        }
    }

    withdraw(pipelineContext: PipelineEventContext) {
        if (!pipelineContext.event.item) {
            throw new Error('Event item is not defined.');
        }

        const event = pipelineContext.event as CSGOEmpireItemEvent;

        return this.account.makeWithdrawal(event.item.id);
    }
};
