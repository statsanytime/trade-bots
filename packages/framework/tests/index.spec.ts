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
import {
    createCSGOEmpirePlugin,
    withdraw,
} from '@statsanytime/trade-bots-csgoempire';
import { createPipeline, startBots, createBot, listen } from '../src/index.js';
import { flushPromises, mockSteamUser, mockSteamSession } from './utils.js';
import { newItemEvent } from './mocks/csgoempire.js';

const mswServer = setupServer();

describe('index test', () => {
    let CSGOEmpireMock: any;

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
});
