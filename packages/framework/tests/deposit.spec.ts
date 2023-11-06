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
import { CSGOEmpire } from 'csgoempire-wrapper';
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
import {
    newItemEvent,
    mswUserInventory,
    mswWithdraw,
} from './mocks/csgoempire.js';
import dayjs from 'dayjs';

const mswServer = setupServer();

describe('deposit test', () => {
    let TradeOfferMock: any;

    beforeEach(() => {
        TradeOfferMock = mockSteamTradeOfferManager();
        mockSteamUser();
        mockSteamSession();
    });

    beforeAll(() => mswServer.listen());

    afterEach(() => {
        mswServer.resetHandlers();
    });

    afterAll(() => mswServer.close());

    test('schedule deposit works', async () => {
        mswServer.use(mswWithdraw);

        vi.spyOn(fs, 'readFile').mockResolvedValue('[]');
        vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

        const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();

        const makeWithdrawalSpy = vi.spyOn(
            CSGOEmpire.prototype,
            'makeWithdrawal',
        );

        const listeners = {};

        vi.spyOn(
            CSGOEmpire.prototype,
            'connectAndAuthenticateSocket',
        ).mockImplementation(function (key) {
            this.sockets[key] = {
                on: vi.fn((event, cb) => {
                    listeners[`${key}:${event}`] = cb;
                }),
            };

            return this.sockets[key];
        });

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

        await listeners['trading:new_item'](newItemEvent);

        expect(makeWithdrawalSpy).toHaveBeenCalledWith(newItemEvent.id);

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
        await flushPromises();

        expect(depositMock).toHaveBeenCalledWith({
            asset_id: 'test',
            price: 6845,
            type: 'auction',
        });
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
