import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';
import * as CSGOEmpire from 'csgoempire-wrapper';
import { setupServer } from 'msw/node';
import { scheduleDeposit } from '@statsanytime/trade-bots-csgofloat';
import {
    createCSGOEmpirePlugin,
    withdraw,
} from '@statsanytime/trade-bots-csgoempire';
import {
    acceptTradeOffer,
    createSteamPlugin,
} from '@statsanytime/trade-bots-steam';
import { createPipeline, startBots, createBot, listen } from '../src/index.js';
import {
    flushPromises,
    mockSteamUser,
    mockSteamSession,
    mockSteamTradeOfferManager,
} from './utils.js';
import { newItemEvent } from './mocks/csgoempire.js';

const mswServer = setupServer();

describe('index test', () => {
    let CSGOEmpireMock: any;
    let TradeOfferMock: any;

    beforeEach(() => {
        CSGOEmpireMock = {
            tradingSocket: {
                on: vi.fn(),
                off: vi.fn(),
                emit: vi.fn(),
            },

            makeWithdrawal: vi.fn(),
        };

        vi.spyOn(CSGOEmpire, 'CSGOEmpire').mockReturnValue(
            new (class {
                tradingSocket = CSGOEmpireMock.tradingSocket;
                makeWithdrawal = CSGOEmpireMock.makeWithdrawal;
            })() as CSGOEmpire.CSGOEmpire,
        );

        TradeOfferMock = mockSteamTradeOfferManager();
        mockSteamUser();
        mockSteamSession();
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

        const onCallback = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        expect(CSGOEmpireMock.tradingSocket.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        onCallback(newItemEvent);

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

        const onCallback = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        expect(CSGOEmpireMock.tradingSocket.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        onCallback(newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawal).toHaveBeenCalledWith(
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

        expect(CSGOEmpireMock.tradingSocket.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        const newItemCb = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        newItemCb(newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawal).toHaveBeenCalledWith(
            newItemEvent.id,
        );

        expect(afterWithdrawFn).not.toHaveBeenCalled();

        await flushPromises();

        expect(afterWithdrawFn).toHaveBeenCalled();
    });

    test('schedule deposit works', async () => {
        vi.spyOn(fs, 'readFile').mockResolvedValue('[]');
        vi.spyOn(fs, 'mkdir').mockResolvedValue('test');

        const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgoempire:item-buyable', async function (item) {
                    await withdraw();

                    await acceptTradeOffer();

                    await scheduleDeposit({
                        amountUsd: item.priceUsd * 1.05,
                    });
                });
            }),
            plugins: [
                createCSGOEmpirePlugin({
                    apiKey: 'testApiKey',
                }),
                createSteamPlugin({
                    accountName: 'test',
                    password: 'test',
                    sharedSecret: 'test',
                    identitySecret: 'test',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        const newItemCb = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        newItemCb(newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawal).toHaveBeenCalledWith(
            newItemEvent.id,
        );

        await flushPromises();

        const managerOnCb = TradeOfferMock.on.mock.calls[0][1];

        managerOnCb({
            id: 'test',
            itemsToGive: [],
            itemsToReceive: [
                {
                    assetid: 'test',
                    market_hash_name: 'USP-S | Kill Confirmed (Minimal Wear)',
                },
            ],
            accept(cb) {
                cb(null, 'completed');
            },
        });

        for (let i = 0; i < 10; i++) {
            await flushPromises();
        }

        expect(writeFileSpy).toHaveBeenCalledWith(
            resolve(__dirname, '../tmp/scheduled-deposits'),
            JSON.stringify([
                {
                    marketplace: 'csgofloat',
                    withdrawMarketplace: 'csgoempire',
                    amountUsd: 68.45,
                    assetId: 'test',
                },
            ]),
            'utf8',
        );
    });
});
