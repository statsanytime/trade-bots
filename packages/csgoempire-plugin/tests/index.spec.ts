import fs from 'node:fs/promises';
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
import { rest } from 'msw';
import { createCSGOEmpirePlugin, withdraw } from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
} from '@statsanytime/trade-bots';
import { flushPromises, mockCSGOEmpire } from './utils.js';
import { newItemEvent, mswUserInventory } from './mocks.js';

const mswServer = setupServer();

describe('CSGOEmpire Plugin', () => {
    let CSGOEmpireMock: any;

    beforeEach(() => {
        CSGOEmpireMock = mockCSGOEmpire();
    });

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
                listen('csgoempire:item-buyable', listenFn);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.listeners['trading:new_item'](newItemEvent);

        expect(listenFn).toHaveBeenCalledWith(
            expect.objectContaining({
                marketId: newItemEvent.id,
                marketName: newItemEvent.market_name,
            }),
        );
    });

    test('withdraw works', async () => {
        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgoempire:item-buyable', function () {
                    withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.listeners['trading:new_item'](newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
        );
    });

    test('after withdraw works', async () => {
        const afterWithdrawFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgoempire:item-buyable', async function () {
                    await withdraw();

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

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await CSGOEmpireMock.listeners['trading:new_item'](newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
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
                listen('csgoempire:item-buyable', async function () {
                    await withdraw();
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.listeners['trading:new_item'](newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawalSpy).toHaveBeenCalledWith(
            newItemEvent.id,
        );
    });

    test('csgoempire price usd works', async () => {
        const listenMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgoempire:item-buyable', listenMock);
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        await CSGOEmpireMock.listeners['trading:new_item'](newItemEvent);

        expect(listenMock).toHaveBeenCalledWith(
            expect.objectContaining({
                priceUsd: 65.187478500172,
            }),
        );
    });

    it('makes deposit to csgoempire correctly', async () => {
        const depositMock = vi.fn();

        mswServer.use(
            rest.post(
                'https://csgoempire.com/api/v2/trading/deposit',
                async (req, res, ctx) => {
                    depositMock(await req.json());

                    return res(
                        ctx.json({
                            success: true,
                        }),
                    );
                },
            ),
            mswUserInventory,
        );

        vi.useFakeTimers();

        // Start from previous test
        vi.spyOn(fs, 'readFile').mockResolvedValue(
            JSON.stringify([
                {
                    marketplaceData: {
                        type: 'auction',
                    },
                    marketplace: 'csgoempire',
                    withdrawMarketplace: 'csgoempire',
                    amountUsd: 68.45,
                    assetId: 'test',
                    // 8 days ago
                    withdrawnAt: new Date(
                        Date.now() - 8 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                },
            ]),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', vi.fn()),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'test',
                }),
            ],
        });

        startBots([bot]);

        vi.runOnlyPendingTimers();

        vi.useRealTimers();

        await flushPromises();

        expect(depositMock).toHaveBeenCalledWith({
            items: [
                {
                    coin_value: 11143,
                    id: 1,
                },
            ],
        });
    });
});
