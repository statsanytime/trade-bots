import { CSGOEmpireMarketplace } from './csgoempire.js';
import { Marketplaces } from './index.js';

export type MarketplaceName = keyof typeof Marketplaces;

export type MarketplaceEvent = 'item-buyable';

export interface ParsedEvent {
    marketplaceName: MarketplaceName;
    marketplaceEvent: MarketplaceEvent;
}

export type Marketplace = CSGOEmpireMarketplace;
