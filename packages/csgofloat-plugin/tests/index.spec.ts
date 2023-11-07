import fs from 'node:fs/promises';
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    test,
    vi,
} from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
    createCSGOFloatPlugin,
    scheduleDeposit,
} from '@statsanytime/trade-bots-csgofloat';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
    getContext,
    Item,
    triggerEvent,
} from '@statsanytime/trade-bots';
import { flushPromises } from './utils.js';
import dayjs from 'dayjs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

const mswServer = setupServer();

describe('deposit test', () => {
    beforeAll(() => mswServer.listen());

    afterEach(() => {
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
                listen('withdraw-event', async function (item) {
                    await scheduleDeposit({
                        amountUsd: item.priceUsd * 1.05,
                        type: 'auction',
                    });
                });
            }),
            plugins: [
                createCSGOFloatPlugin({
                    apiKey: 'test',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        // Call it as if a withdraw has been made
        const item = new Item({
            marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
            marketId: 'test',
            priceUsd: 65.19,
            assetId: 'test',
        });

        getContext().call(
            {
                bot,
                item,
                withdrawnAt: dayjs(),
                marketplace: 'csgoempire',
            },
            async () => {
                await triggerEvent('withdraw-event', item);
            },
        );

        await flushPromises();

        const scheduledDeposit = JSON.parse(
            writeFileSpy.mock.calls[0][1] as string,
        )[0];

        expect(scheduledDeposit.withdrawnAt).toBeDefined();
        expect(
            dayjs(scheduledDeposit.withdrawnAt).isSame(dayjs(), 'day'),
        ).toBeTruthy();

        expect(writeFileSpy).toHaveBeenCalledWith(
            resolve(cwd(), './tmp/scheduled-deposits'),
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
});
