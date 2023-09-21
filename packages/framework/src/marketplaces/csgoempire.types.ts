import { PipelineContextEvent } from "../types.js";

export interface CSGOEmpireItem {
    auction_ends_at: null | number;
    auction_highest_bid: null | number;
    auction_highest_bidder: null | number;  
    auction_number_of_bids: number;
    custom_price_percentage: string;
    icon_url: string;
    is_commodity: boolean;
    market_name: string;
    market_value: number;
    name_color: string;
    preview_id: string;
    price_is_unreliable: boolean;
    stickers: any[];
    wear: number;
    published_at: string;
    id: number;
    depositor_stats: {
        delivery_rate_recent: number;
        delivery_rate_long: number;
        delivery_time_minutes_recent: number;
        delivery_time_minutes_long: number;
        steam_level_min_range: number;
        steam_level_max_range: number;
        user_has_trade_notifications_enabled: boolean;
        user_is_online: null;
    };
    above_recommended_price: number;
    purchase_price: number;
    item_search: {
        category: string;
        type: string;
        sub_type: string;
        rarity: string;
    };
}

export interface CSGOEmpireItemEvent extends PipelineContextEvent {
    item: {
        id: number;
    }
}

export type InitSocketEvent = {
    authenticated: false;
    serverTime: string;
    server: string;
    roles: string[];
    helper_mod: boolean;
    mod: boolean;
    super_mod: boolean;
    admin: boolean;
    qa: boolean;
    badge_text: null | string;
    badge_text_localized: null | string;
    badge_color: null | string;
} | {
    authenticated: true;
    serverTime: string;
    server: string;
    id: number;
    steam_name: string;
    steam_id: string;
    avatar: string;
    profile_url: string;
    bet_threshold: number;
    total_bet: number;
    total_deposit: number;
    withdraw_limit: number;
    ref_id: number;
    referral_code: string;
    muted_until: number;
    mute_reason: string;
    utm_campaign: string;
    whitelisted: boolean;
    registration_ip: string;
    steam_level: number;
    registration_timestamp: string;
    total_profit: number;
    roles: string[];
    chat_tag: {
        text: string;
        localized_text: null | string;
        color: string;
        hide_rank: boolean;
    };
    uid: number;
    helper_mod: boolean;
    mod: boolean;
    super_mod: boolean;
    admin: boolean;
    qa: boolean;
    deposited: boolean;
    lvl: number;
    badge_text: string;
    badge_text_localized: null | string;
    badge_color: string;
    hide_rank: boolean;
    name: string;
    balance: number;
}
