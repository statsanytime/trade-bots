import { afterEach, describe, expect, test, vi } from 'vitest';
import { CSGOEmpire } from 'csgoempire-wrapper';
import { CSGOEmpireMarketplace, createPipeline, startBots } from '../src/index.ts';

vi.mock('csgoempire-wrapper', () => {
    const tradingSocketOnMock = vi.fn();
    const makeWithdrawalMock = vi.fn();

    class CSGOEmpireMock {
        tradingSocket = {
            on: tradingSocketOnMock,
            emit: vi.fn(),
        };

        makeWithdrawal = makeWithdrawalMock;
    }

    return {
        CSGOEmpire: CSGOEmpireMock,
    };
});

const newItemEvent = {
    auction_ends_at: 1695323751,
    auction_highest_bid: null,
    auction_highest_bidder: null,
    auction_number_of_bids: 0,
    custom_price_percentage: "0.00",
    icon_url: "-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoo6m1FBRp3_bGcjhQ09-jq5WYh8j_OrfdqWhe5sN4mOTE8bP5gVO8v109YDj0do7Dcw9taA6C81K_k-_n1pfp6MnOnSZhu3Qm4SrfzBbkg01McKUx0iC2I2fd",
    is_commodity: false,
    market_name: "USP-S | Kill Confirmed (Minimal Wear)",
    market_value: 10612,
    name_color: "D2D2D2",
    preview_id: "660802ed14b2",
    price_is_unreliable: false,
    stickers: [],
    wear: 0.086,
    published_at: "2023-09-21T19:12:52.418417Z",
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
        category: "Weapon",
        type: "Pistol",
        sub_type: "USP-S",
        rarity: "Covert",
    },
};

describe('index test', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    test('listening for events works', async () => {
        const listenFn = vi.fn();

        const bot = {
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', listenFn);
            }),
            marketplaces: [
                new CSGOEmpireMarketplace({
                    apiKey: 'testApiKey',
                }),
            ],
        };

        startBots([bot]);

        const onFn = (new CSGOEmpire).tradingSocket.on;
        const onCallback = onFn.mock.calls[1][1];

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));

        onCallback(newItemEvent);

        expect(listenFn).toHaveBeenCalledWith(newItemEvent);
    });

    test('withdraw works', async () => {
        const bot = {
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', function () {
                    this.withdraw();
                });
            }),
            marketplaces: [
                new CSGOEmpireMarketplace({
                    apiKey: 'testApiKey',
                }),
            ],
        };

        startBots([bot]);

        const onFn = (new CSGOEmpire).tradingSocket.on;
        const withdrawFn = (new CSGOEmpire).makeWithdrawal;
        const onCallback = onFn.mock.calls[1][1];

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));

        onCallback(newItemEvent);

        expect(withdrawFn).toHaveBeenCalledWith(newItemEvent.id);
    });
});