import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    test,
    vi,
} from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
    createCSGOEmpirePlugin,
    onItemBuyable,
    scheduleDeposit,
    withdraw,
} from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    useContext,
    checkScheduledDeposits,
    ScheduledDeposit,
} from '@statsanytime/trade-bots';
import { testStorage, flushPromises } from '@statsanytime/trade-bots-shared';
import { mockCSGOEmpire } from './utils.js';
import {
    newItemEvent,
    mswUserInventory,
    mswWithdraw,
    mswBid,
    depositTradeStatusEvent,
    auctionUpdateEvent,
    withdrawTradeStatusEvent,
} from './mocks.js';
import consola from 'consola';

const mswServer = setupServer();

describe('CSGOEmpire Plugin', () => {
    let CSGOEmpireMock: any;

    beforeEach(() => {
        CSGOEmpireMock = mockCSGOEmpire();
    });

    beforeAll(() => mswServer.listen());

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        mswServer.resetHandlers();

        testStorage.clear();
    });

    afterAll(() => {
        vi.useRealTimers();
        mswServer.close();
    });

    test('listening for events works', async () => {
        const listenFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(listenFn);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(listenFn).toHaveBeenCalledWith(
            expect.objectContaining({
                marketId: newItemEvent.id,
                marketName: newItemEvent.market_name,
            }),
        );

        listenFn.mockClear();

        await CSGOEmpireMock.callListener('trading:new_item', [newItemEvent]);

        expect(listenFn).toHaveBeenCalledWith(
            expect.objectContaining({
                marketId: newItemEvent.id,
                marketName: newItemEvent.market_name,
            }),
        );
    });

    test('withdraw works', async () => {
        mswServer.use(mswWithdraw);

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(function () {
                    withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        await flushPromises();

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );

        expect(await testStorage.getItem('withdrawals')).toEqual([
            {
                amountUsd: 65.187478500172,
                id: expect.any(String),
                item: {
                    marketId: 11,
                    marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
                    priceUsd: 65.187478500172,
                    auction: {
                        bidCount: 0,
                        endsAt: null,
                        highestBid: null,
                        highestBidder: null,
                    },
                },
                madeAt: expect.any(String),
                marketplace: 'csgoempire',
                marketplaceId: '1',
            },
        ]);
    });

    test('after withdraw works', async () => {
        mswServer.use(mswWithdraw);

        const afterWithdrawFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(async function () {
                    await withdraw();

                    afterWithdrawFn();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );

        expect(afterWithdrawFn).not.toHaveBeenCalled();

        await flushPromises();

        expect(afterWithdrawFn).toHaveBeenCalled();
    });

    test('no exception is thrown on failed withdrawal', async () => {
        CSGOEmpireMock.makeWithdrawalSpy.mockRejectedValueOnce(
            new Error('test error'),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(async function () {
                    await withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );
    });

    test('no exception is thrown on failed bid', async () => {
        CSGOEmpireMock.placeBidSpy.mockRejectedValueOnce(
            new Error('test error'),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(async function () {
                    await withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.callListener('trading:new_item', {
            ...newItemEvent,
            auction_ends_at: Date.now() + 1000 * 60 * 5,
        });

        expect(CSGOEmpireMock.placeBidSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );
    });

    test('csgoempire price usd works', async () => {
        const listenMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(listenMock);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(listenMock).toHaveBeenCalledWith(
            expect.objectContaining({
                priceUsd: 65.187478500172,
            }),
        );
    });

    it('makes deposit to csgoempire correctly', async () => {
        const depositMock = vi.fn();

        mswServer.use(
            http.post(
                'https://csgoempire.com/api/v2/trading/deposit',
                async ({ request }) => {
                    depositMock(await request.json());

                    return HttpResponse.json({
                        success: true,
                    });
                },
            ),
            mswUserInventory,
            mswWithdraw,
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                onItemBuyable(async () => {
                    await withdraw();

                    // Pretend steam accepted the offer and set the asset id
                    const context = useContext();
                    context.item!.assetId = '123';

                    await scheduleDeposit({
                        amountUsd: 68.45,
                    });
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'test',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );

        await vi.waitUntil(
            async () => await testStorage.hasItem('scheduled-deposits'),
        );

        // Go forward 8 days when the item is tradable
        vi.setSystemTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));

        await checkScheduledDeposits(bot);

        await vi.waitUntil(
            () => 'trading:trade_status' in CSGOEmpireMock.listeners,
        );

        await CSGOEmpireMock.callListener(
            'trading:trade_status',
            depositTradeStatusEvent,
        );

        await vi.waitUntil(() => testStorage.hasItem('deposits'));

        expect(depositMock).toHaveBeenCalledWith({
            items: [
                {
                    coin_value: 11143,
                    id: 1,
                },
            ],
        });

        await vi.waitUntil(
            async () =>
                (
                    (await testStorage.getItem('scheduled-deposits')) as
                        | ScheduledDeposit[]
                        | null
                )?.length === 0,
        );

        expect(await testStorage.getItem('scheduled-deposits')).toEqual([]);
    });

    it('handles timed out deposit correctly', async () => {
        vi.useFakeTimers();

        const depositMock = vi.fn();
        const consolaMock = vi.spyOn(consola, 'error').mockImplementation(() => {});

        mswServer.use(
            http.post(
                'https://csgoempire.com/api/v2/trading/deposit',
                async ({ request }) => {
                    depositMock(await request.json());

                    return HttpResponse.json({
                        success: true,
                    });
                },
            ),
            mswUserInventory,
            mswWithdraw,
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                onItemBuyable(async () => {
                    await withdraw();

                    // Pretend steam accepted the offer and set the asset id
                    const context = useContext();
                    context.item!.assetId = '123';

                    await scheduleDeposit({
                        amountUsd: 68.45,
                    });
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'test',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await vi.runOnlyPendingTimersAsync();

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            106.12,
        );

        await vi.waitUntil(
            async () => await testStorage.hasItem('scheduled-deposits'),
        );

        expect(await testStorage.getItem('scheduled-deposits')).toHaveLength(1);

        // Go forward 8 days when the item is tradable
        vi.setSystemTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));

        await checkScheduledDeposits(bot);

        // Go forward 60 seconds
        await vi.advanceTimersByTimeAsync(60 * 1000);

        expect(consolaMock).toHaveBeenCalledWith(
            'Failed to deposit item',
            expect.any(Object),
        );

        // Ensure the deposit is still scheduled and can be retried
        expect(await testStorage.getItem('scheduled-deposits')).toHaveLength(1);
    });

    test('auction update works', async () => {
        mswServer.use(mswBid);

        const afterWithdrawFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(function (item) {
                    if (item.priceUsd === 68.25) {
                        withdraw();

                        afterWithdrawFn();
                    }
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'auction_update',
            expect.any(Function),
        );

        await CSGOEmpireMock.callListener('trading:new_item', newItemEvent);

        await flushPromises();

        expect(CSGOEmpireMock.placeBidSpy).not.toHaveBeenCalled();
        expect(await testStorage.getItem('withdrawals')).toEqual(null);

        await CSGOEmpireMock.callListener(
            'trading:auction_update',
            auctionUpdateEvent,
        );

        await flushPromises();

        expect(CSGOEmpireMock.placeBidSpy).toHaveBeenCalledWith(
            newItemEvent.id,
            111.11,
        );

        await flushPromises();

        await vi.waitUntil(
            () => 'trading:trade_status' in CSGOEmpireMock.listeners,
        );

        await CSGOEmpireMock.callListener(
            'trading:trade_status',
            withdrawTradeStatusEvent,
        );

        await flushPromises();

        expect(await testStorage.getItem('withdrawals')).toEqual([
            {
                amountUsd: 68.25,
                id: expect.any(String),
                item: {
                    marketId: 11,
                    marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
                    priceUsd: 68.25,
                    auction: {
                        bidCount: 1,
                        endsAt: expect.any(String),
                        highestBid: 67.57,
                        highestBidder: 1,
                    },
                },
                madeAt: expect.any(String),
                marketplace: 'csgoempire',
                marketplaceId: '1',
            },
        ]);

        expect(afterWithdrawFn).toHaveBeenCalled();
    });

    it('does not dismiss bid from its own auction update', async () => {
        mswServer.use(mswBid);

        const afterWithdrawFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(async (item) => {
                    if (Math.round(item.priceUsd) === 65) {
                        await withdraw();

                        afterWithdrawFn();
                    }
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'auction_update',
            expect.any(Function),
        );

        await CSGOEmpireMock.callListener('trading:new_item', {
            ...newItemEvent,
            auction_ends_at: Date.now() + 1000 * 60 * 5,
        });

        await flushPromises();

        expect(CSGOEmpireMock.placeBidSpy).toHaveBeenCalled();
        expect(await testStorage.getItem('withdrawals')).toEqual(null);

        await CSGOEmpireMock.callListener(
            'trading:auction_update',
            auctionUpdateEvent,
        );

        await flushPromises();

        await vi.waitUntil(
            () => 'trading:trade_status' in CSGOEmpireMock.listeners,
        );

        await CSGOEmpireMock.callListener(
            'trading:trade_status',
            withdrawTradeStatusEvent,
        );

        await flushPromises();

        expect(await testStorage.getItem('withdrawals')).toEqual([
            {
                amountUsd: 68.25,
                id: expect.any(String),
                item: {
                    marketId: 11,
                    marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
                    priceUsd: 68.25,
                    auction: {
                        bidCount: 1,
                        endsAt: expect.any(String),
                        highestBid: 67.57,
                        highestBidder: 1,
                    },
                },
                madeAt: expect.any(String),
                marketplace: 'csgoempire',
                marketplaceId: '1',
            },
        ]);
    });
});
