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
import {
    createPricempirePlugin,
    getPrice,
} from '@statsanytime/trade-bots-pricempire';
import { createPipeline, startBots, createBot, listen } from '../src/index.js';
import {
    flushPromises,
    mockSteamUser,
    mockSteamSession,
    mockCSGOEmpire,
} from './utils.js';
import { newItemEvent, mswWithdraw } from './mocks/csgoempire.js';
import { mswItemPrices } from './mocks/pricempire.js';

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

    test('price sources work', async () => {
        mswServer.use(mswItemPrices, mswWithdraw);

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                listen('csgoempire:item-buyable', (item) => {
                    if (getPrice('buff_buy') === 10) {
                        withdraw();
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
                    version: 'v3',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        expect(CSGOEmpireMock.sockets.trading.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

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
});
