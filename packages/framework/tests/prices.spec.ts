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
import { rest } from 'msw';
import {
    createCSGOEmpirePlugin,
    withdraw,
} from '@statsanytime/trade-bots-csgoempire';
import {
    createPricempirePlugin,
    getPrice,
} from '@statsanytime/trade-bots-pricempire';
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

        const onCallback = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        expect(CSGOEmpireMock.tradingSocket.on).toHaveBeenCalledWith(
            'new_item',
            expect.any(Function),
        );

        await flushPromises();

        onCallback(newItemEvent);

        expect(CSGOEmpireMock.makeWithdrawal).toHaveBeenCalledWith(
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

        const onCallback = CSGOEmpireMock.tradingSocket.on.mock.calls[1][1];

        onCallback(newItemEvent);

        expect(listenMock).toHaveBeenCalledWith(
            expect.objectContaining({
                priceUsd: 65.187478500172,
            }),
        );
    });
});
