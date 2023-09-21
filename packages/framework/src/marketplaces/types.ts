import { CSGOEmpireMarketplace } from './csgoempire.js';

export type MarketplaceName = 'csgoempire';

export type MarketplaceEvent = 'item-buyable';

export interface ParsedEvent {
    marketplaceName: MarketplaceName;
    marketplaceEvent: MarketplaceEvent;
}

export type Marketplace = CSGOEmpireMarketplace;
