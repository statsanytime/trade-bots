export interface CSGO500PluginOptions {
    apiKey: string;
    userId: string;
}

export interface CSGO500Item {
    name: string;
    appId: number;
    assetId: string;
    classId: string;
    instanceId: string;
    isInspected: boolean;
    stickers: {
        icon: string;
        name: string;
    }[];
    imageUrl: string;
    commodity: boolean;
    type: string;
    nameColor: string;
    phase: string | null;
    paintwear: number | null; // available if isInspected
    paintseed: number | null; // available if isInspected
    paintindex: number | null; // available if isInspected
    screenshotId: string | null;
    screenshotAvailable: boolean;
    exterior: string | null;
    shortExterior: string | null;
    skinName: string | null;
}

export interface CSGO500Listing {
    id: string; // this is not listed in the docs for some reason. Might be worth keeping in mind
    userId?: string; // seller userId
    openId?: string; // seller Steam64Id
    requestUserId?: string | null; // buyer userId
    requestOpenId?: string | null; // buyer Steam64Id
    requestTradeURL?: string; // buyer steam trade URL, visible after purchase
    appId: number;
    name: string; // item name
    item: CSGO500Item;
    value: number; // value set by user
    originalValue: number; // value "suggested" by us
    modifier: number; // percent difference between originalValue and value
    modifierValue: number; // difference between originalValue and value
    status: number;
    createDate: string;
    requestDate: string;
    confirmDate: string;
    expireDate?: string;
    timeoutDate?: string;
    endDate?: string;
    auctionHighestBidUserId: string | null;
    auctionHighestBidValue: number | null;
    auctionEndDate: string;
    auctionBidsCount: number;
    contextId: number;
    shortStatus: string;
    niceStatus: string;
}

export interface CSGO500MarketListingUpdateEvent {
    listing: CSGO500Listing;
}

export interface CSGO500MarketListingAuctionUpdateEvent {
    listing: Pick<
        CSGO500Listing,
        | 'id'
        | 'userId'
        | 'name'
        | 'value'
        | 'originalValue'
        | 'auctionHighestBidUserId'
        | 'auctionHighestBidValue'
        | 'auctionEndDate'
        | 'auctionBidsCount'
    >;
}
