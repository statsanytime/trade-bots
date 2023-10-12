import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    test,
    vi,
} from 'vitest';
import { CSGOEmpire } from 'csgoempire-wrapper';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createCSGOEmpirePlugin } from '@statsanytime/trade-bots-csgoempire';
import { createPricempirePlugin } from '@statsanytime/trade-bots-pricempire';
import { createPipeline, startBots, createBot } from '../src/index.ts';
import { flushPromises } from './utils.js';

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

const mswServer = setupServer();

const newItemEvent = {
    auction_ends_at: 1695323751,
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

const tradeStatusCompletedEvent = {
    type: 'withdrawal',
    data: {
        status: 6,
        status_message: 'Completed',
        id: 1,
        item_id: 1,
        tradeoffer_id: 1,
        item: {
            market_name: 'USP-S | Kill Confirmed (Minimal Wear)',
            market_value: 106.12,
        },
        total_value: 10612,
    },
};

describe('index test', () => {
    beforeAll(() => mswServer.listen());

    afterEach(() => {
        vi.resetAllMocks();
        mswServer.resetHandlers();
    });

    afterAll(() => mswServer.close());

    test('listening for events works', async () => {
        const listenFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', listenFn);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        const onFn = new CSGOEmpire().tradingSocket.on;
        const onCallback = onFn.mock.calls[1][1];

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));

        onCallback(newItemEvent);

        expect(listenFn).toHaveBeenCalledWith(
            expect.objectContaining({
                pipelineContext: expect.any(Object),
                marketId: newItemEvent.id,
                marketName: newItemEvent.market_name,
            }),
        );
    });

    test('withdraw works', async () => {
        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', function () {
                    this.withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        const onFn = new CSGOEmpire().tradingSocket.on;
        const withdrawFn = new CSGOEmpire().makeWithdrawal;
        const onCallback = onFn.mock.calls[1][1];

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));

        onCallback(newItemEvent);

        expect(withdrawFn).toHaveBeenCalledWith(newItemEvent.id);
    });

    test('after withdraw works', async () => {
        const afterWithdrawFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', async function () {
                    await this.withdraw();

                    afterWithdrawFn();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        const onFn = new CSGOEmpire().tradingSocket.on;
        const withdrawFn = new CSGOEmpire().makeWithdrawal;

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));
        const newItemCb = onFn.mock.calls[1][1];

        newItemCb(newItemEvent);

        expect(withdrawFn).toHaveBeenCalledWith(newItemEvent.id);

        expect(onFn).toHaveBeenCalledWith('trade_status', expect.any(Function));
        const tradeStatusCb = onFn.mock.calls[2][1];

        expect(afterWithdrawFn).not.toHaveBeenCalled();

        tradeStatusCb(tradeStatusCompletedEvent);

        await flushPromises();

        expect(afterWithdrawFn).toHaveBeenCalled();
    });

    test('price sources work', async () => {
        mswServer.use(
            rest.get(
                'https://api.pricempire.com/v3/items/prices',
                (req, res, ctx) => {
                    return res(
                        ctx.json({
                            'USP-S | Kill Confirmed (Minimal Wear)': {
                                buff_buy: {
                                    isInflated: false,
                                    price: 1000,
                                    count: 18,
                                    avg30: 16,
                                    createdAt: '2023-09-23T12:42:46.690Z',
                                },
                            },
                        }),
                    );
                },
            ),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', function (item) {
                    if (item.getPrice('pricempire', 'buff_buy') === 10) {
                        this.withdraw();
                    }
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
                createPricempirePlugin({
                    apiKey: 'testApiKey',
                    sources: ['buy_order'],
                }),
            ],
        });

        startBots([bot]);

        const onFn = new CSGOEmpire().tradingSocket.on;
        const withdrawFn = new CSGOEmpire().makeWithdrawal;
        const onCallback = onFn.mock.calls[1][1];

        expect(onFn).toHaveBeenCalledWith('new_item', expect.any(Function));

        await flushPromises();

        onCallback(newItemEvent);

        expect(withdrawFn).toHaveBeenCalledWith(newItemEvent.id);
    });

    test('csgoempire price usd works', async () => {
        const listenMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                this.listen('csgoempire:item-buyable', listenMock);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        const onFn = new CSGOEmpire().tradingSocket.on;
        const onCallback = onFn.mock.calls[1][1];

        onCallback(newItemEvent);

        expect(listenMock).toHaveBeenCalledWith(
            expect.objectContaining({
                priceUsd: 65.187478500172,
            }),
        );
    });
});
