import { http, HttpResponse } from 'msw';
import {
    CSGOEmpireTradeStatus,
    CSGOEmpireTradeStatusEvent,
} from '../src/types';

export const newItemEvent = {
    auction_ends_at: null,
    auction_highest_bid: null,
    auction_highest_bidder: null,
    auction_number_of_bids: 0,
    custom_price_percentage: '0.00',
    icon_url:
        '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoo6m1FBRp3_bGcjhQ09-jq5WYh8j_OrfdqWhe5sN4mOTE8bP5gVO8v109YDj0do7Dcw9taA6C81K_k-_n1pfp6MnOnSZhu3Qm4SrfzBbkg01McKUx0iC2I2fd',
    is_commodity: false,
    market_name: 'USP-S | Kill Confirmed (Minimal Wear)',
    market_value: 10612,
    name_color: 'D2D2D2',
    preview_id: '660802ed14b2',
    price_is_unreliable: false,
    stickers: [],
    wear: 0.086,
    published_at: '2023-09-21T19:12:52.418417Z',
    id: 1,
    depositor_stats: {
        delivery_rate_recent: 1,
        delivery_rate_long: 0.9259259259259259,
        delivery_time_minutes_recent: 29,
        delivery_time_minutes_long: 21,
        steam_level_min_range: 21,
        steam_level_max_range: 40,
        user_has_trade_notifications_enabled: true,
        user_is_online: null,
    },
    above_recommended_price: -5.66,
    purchase_price: 10612,
    item_search: {
        category: 'Weapon',
        type: 'Pistol',
        sub_type: 'USP-S',
        rarity: 'Covert',
    },
};

export const auctionUpdateEvent = {
    id: 1,
    above_recommended_price: 0,
    auction_highest_bid: 11000,
    auction_highest_bidder: 1,
    auction_number_of_bids: 1,
    // Now + 3 minutes
    auction_ends_at: Date.now() / 1000 + 180,
};

export const depositTradeStatusEvent: CSGOEmpireTradeStatusEvent = {
    type: 'deposit',
    data: {
        item: {
            market_name: 'StatTrak™ AK-47 | Aquamarine Revenge (Well-Worn)',
            market_value: 51.43,
            asset_id: 123,
        },
        status: 4,
        status_message: 'Confirming',
        tradeoffer_id: 1,
        id: 1,
        item_id: 1,
    },
};

export const withdrawTradeStatusEvent: CSGOEmpireTradeStatusEvent = {
    type: 'withdrawal',
    data: {
        item: {
            market_name: 'StatTrak™ AK-47 | Aquamarine Revenge (Well-Worn)',
            market_value: 51.43,
        },
        status: CSGOEmpireTradeStatus.Confirming,
        status_message: 'Confirming',
        tradeoffer_id: 1,
        id: 1,
        item_id: 1,
        total_value: 51.43,
    },
};

export const mswUserInventory = http.get(
    'https://csgoempire.com/api/v2/trading/user/inventory',
    async () =>
        HttpResponse.json({
            allowUpdate: true,
            cursor: 'eyJmdWxsX3Bvc2l0aW9uIjo1MCwiX3BvaW50c1RvTmV4dEl0ZW1zIjp0cnVlfQ',
            data: [
                {
                    // This is normally returned as a number, but this is a test, so who cares
                    asset_id: 123,
                    created_at: '2023-10-20 14:48:30',
                    custom_price_percentage: null,
                    full_position: 1,
                    icon_url:
                        '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXQ9Q1LO5kNoBhSQl-fEv2o1t3QXFR6a1wE4uOkKlFm0qvJd2gSvYS3x9nbwfXyZrqBxDkCvZYmjurEpomlilL6ux07YtuiRwA',
                    id: 1,
                    invalid:
                        "This item's price is either unstable or not found. Please contact support if you would like to deposit this item.",
                    is_commodity: false,
                    market_name: '5 Year Veteran Coin',
                    market_value: -1,
                    max_auction_value: 0,
                    name_color: 'D2D2D2',
                    position: null,
                    preview_id: null,
                    price_is_unreliable: false,
                    stickers: null,
                    tradable: false,
                    tradelock: false,
                    updated_at: '2023-11-05 19:54:26',
                    wear: null,
                },
            ],
            success: true,
            totalCount: 533,
            totalValue: 145073,
            updatedAt: 1699212970,
        }),
);

export const mswWithdraw = http.post(
    'https://csgoempire.com/api/v2/trading/deposit/:id/withdraw',
    // This response is incomplete, but it doesn't matter for the test
    async () =>
        HttpResponse.json({
            success: true,
            data: {
                id: 1,
            },
        }),
);

export const mswBid = http.post(
    'https://csgoempire.com/api/v2/trading/deposit/:id/bid',
    // This response is incomplete, but it doesn't matter for the test
    async () =>
        HttpResponse.json({
            success: true,
        }),
);
