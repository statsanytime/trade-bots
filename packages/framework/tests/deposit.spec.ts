import fs from 'node:fs/promises';
import { resolve } from 'node:path';
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
import * as CSGOEmpire from 'csgoempire-wrapper';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
    createCSGOFloatPlugin,
    scheduleDeposit,
} from '@statsanytime/trade-bots-csgofloat';
import {
    createCSGOEmpirePlugin,
    withdraw,
} from '@statsanytime/trade-bots-csgoempire';
import {
    acceptTradeOffer,
    createSteamPlugin,
} from '@statsanytime/trade-bots-steam';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
    depositIsTradable,
} from '../src/index.js';
import {
    flushPromises,
    mockSteamUser,
    mockSteamSession,
    mockSteamTradeOfferManager,
} from './utils.js';
import { newItemEvent } from './mocks/csgoempire.js';
import dayjs from 'dayjs';

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

    test('schedule deposit works', async () => {
        vi.spyOn(fs, 'readFile').mockResolvedValue('[]');
        vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

        const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgoempire:item-buyable', async function (item) {
                    await withdraw();

                    await acceptTradeOffer();

                    await scheduleDeposit({
                        amountUsd: item.priceUsd * 1.05,
                        type: 'auction',
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
                createCSGOFloatPlugin({
                    apiKey: 'test',
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
            accept(cb: Function) {
                cb(null, 'completed');
            },
        });

        for (let i = 0; i < 10; i++) {
            await flushPromises();
        }

        const scheduledDeposit = JSON.parse(
            writeFileSpy.mock.calls[0][1] as string,
        )[0];

        expect(scheduledDeposit.withdrawnAt).toBeDefined();
        expect(
            dayjs(scheduledDeposit.withdrawnAt).isSame(dayjs(), 'day'),
        ).toBeTruthy();

        expect(writeFileSpy).toHaveBeenCalledWith(
            resolve(__dirname, '../tmp/scheduled-deposits'),
            JSON.stringify([
                {
                    marketplaceData: {
                        type: 'auction',
                    },
                    marketplace: 'csgofloat',
                    withdrawMarketplace: 'csgoempire',
                    amountUsd: 68.45,
                    assetId: 'test',
                    withdrawnAt: scheduledDeposit.withdrawnAt,
                },
            ]),
            'utf8',
        );
    });

    it('makes deposit correctly', async () => {
        const depositMock = vi.fn();

        mswServer.use(
            rest.post(
                'https://csgofloat.com/api/v1/listings',
                async (req, res, ctx) => {
                    depositMock(await req.json());

                    return res(
                        ctx.json({
                            success: true,
                        }),
                    );
                },
            ),
        );

        vi.useFakeTimers();

        // Start from previous test
        vi.spyOn(fs, 'readFile').mockResolvedValue(
            JSON.stringify([
                {
                    marketplaceData: {
                        type: 'auction',
                    },
                    marketplace: 'csgofloat',
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
                createCSGOFloatPlugin({
                    apiKey: 'test',
                }),
            ],
        });

        startBots([bot]);

        vi.runOnlyPendingTimers();

        vi.useRealTimers();

        await flushPromises();
        await flushPromises();

        expect(depositMock).toHaveBeenCalledWith({
            asset_id: 'test',
            price: 6845,
            type: 'auction',
        });
    });

    test('depositIsTradable works', () => {
        vi.setSystemTime(dayjs.tz('2021-11-20 12:00', 'PST').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 12:00', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 12:00', 'PST')),
        ).toBeFalsy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-12 23:59', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 00:01', 'PST')),
        ).toBeFalsy();

        vi.setSystemTime(dayjs.tz('2021-11-20 00:00', 'PST').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 23:59', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 00:01', 'PST')),
        ).toBeFalsy();

        vi.setSystemTime(dayjs.tz('2021-11-20 09:00', 'CET').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 08:59', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-12 09:01', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 08:59', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 09:01', 'CET')),
        ).toBeFalsy();
    });
});
