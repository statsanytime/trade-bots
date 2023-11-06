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
import { setupServer } from 'msw/node';
import {
    createCSGOEmpirePlugin,
    withdraw,
} from '@statsanytime/trade-bots-csgoempire';
import { createPipeline, startBots, createBot, listen } from '../src/index.js';
import {
    flushPromises,
    mockSteamUser,
    mockSteamSession,
    mockCSGOEmpire,
} from './utils.js';
import { newItemEvent } from './mocks/csgoempire.js';

const mswServer = setupServer();

describe('index test', () => {
    let CSGOEmpireMock: any;

    beforeEach(() => {
        CSGOEmpireMock = mockCSGOEmpire();
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
});
