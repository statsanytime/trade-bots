import type { ListenableEvents } from '../types.js';
import type { MarketplaceEvent, MarketplaceName, ParsedEvent } from './types.js';

export function parseEvent(event: ListenableEvents): ParsedEvent {
    const [marketplaceName, marketplaceEvent] = event.split(':') as [
        MarketplaceName,
        MarketplaceEvent,
    ];

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
