import type { ListenableEvents } from '../types.js';
import { CSGOEmpireMarketplace } from './csgoempire.js';
import { MarketplaceEvent, MarketplaceName, ParsedEvent } from './types.js';

export const Marketplaces = {
    'csgoempire': CSGOEmpireMarketplace,
};

export function parseEvent(event: ListenableEvents): ParsedEvent {
    const [marketplaceName, marketplaceEvent] = event.split(':') as [MarketplaceName, MarketplaceEvent];

    if (!marketplaceName || !Marketplaces[marketplaceName]) {
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
