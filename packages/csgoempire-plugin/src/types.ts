export interface CSGOEmpireNewItemEvent {
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

export enum CSGOEmpireTradeStatus {
    Error = -1,
    Processing = 2,
    Sending = 3,
    Confirming = 4,
    Sent = 5,
    Completed = 6,
    Canceled = 8,
    TimedOut = 9,
}

type CSGOEmpireItem = {
    market_name: string;
    market_value: number;
};

type CSGOEmpireWithdrawalStatus = {
    type: 'withdrawal';
    data: {
        id: number;
        total_value: number;
        item_id: number;
        item: CSGOEmpireItem;
        status: CSGOEmpireTradeStatus.Confirming;
        status_message: 'Confirming';
        tradeoffer_id: number;
    };
};

type CSGOEmpireSendingStatus = {
    type: 'withdrawal';
    data: {
        status: CSGOEmpireTradeStatus.Sending;
        status_message: 'Sending';
        metadata: {
            item_validation: {
                numWrongItemDetections?: number;
                validItemDetected?: boolean;
            };
            expires_at: number;
        };
        id: number;
        item_id: number;
        tradeoffer_id: number;
        item: CSGOEmpireItem;
        total_value: number;
    };
};

type CSGOEmpireSentStatus = {
    type: 'withdrawal';
    data: {
        status: CSGOEmpireTradeStatus.Sent;
        status_message: 'Sent';
        metadata: {
            item_validation: {
                validItemDetected: true;
            };
            expires_at: number;
        };
        id: number;
        item_id: number;
        tradeoffer_id: number;
        item: CSGOEmpireItem;
        total_value: number;
    };
};

type CSGOEmpireCompletedStatus = {
    type: 'withdrawal';
    data: {
        status: CSGOEmpireTradeStatus.Completed;
        status_message: 'Completed';
        id: number;
        item_id: number;
        tradeoffer_id: number;
        item: CSGOEmpireItem;
        total_value: number;
    };
};

type CSGOEmpireErroredStatus = {
    type: 'withdrawal';
    data: {
        status: CSGOEmpireTradeStatus.Error;
        status_message: 'Error';
        id: number;
        item_id: number;
        tradeoffer_id: number;
        item: CSGOEmpireItem;
        total_value: number;
    };
};

export type CSGOEmpireTradeStatusEvent =
    | CSGOEmpireWithdrawalStatus
    | CSGOEmpireSendingStatus
    | CSGOEmpireSentStatus
    | CSGOEmpireCompletedStatus
    | CSGOEmpireErroredStatus;

export type InitSocketEvent =
    | {
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
      }
    | {
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
      };

export interface CSGOEmpirePluginOptions {
    apiKey: string;
}
