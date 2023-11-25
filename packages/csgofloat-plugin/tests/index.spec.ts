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
import { createCSGOFloatPlugin, scheduleDeposit } from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
    getContext,
    Item,
    callContextHook,
    Withdrawal,
    appendStorageItem,
    checkScheduledDeposits,
} from '@statsanytime/trade-bots';
import { testStorage, flushPromises } from '@statsanytime/trade-bots-shared';

const mswServer = setupServer();

describe('deposit test', () => {
    beforeAll(() => mswServer.listen());

    afterEach(() => {
        mswServer.resetHandlers();
    });

    afterAll(() => mswServer.close());

    test('schedule deposit works', async () => {
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
            storage: testStorage,
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

        const withdrawal = new Withdrawal({
            marketplace: 'csgoempire',
            marketplaceId: 'test',
            amountUsd: 65.19,
            item,
        });

        await appendStorageItem(testStorage, 'withdrawals', withdrawal);

        getContext().call(
            {
                bot,
                item,
                withdrawal,
                marketplace: 'csgoempire',
            },
            async () => {
                await callContextHook('withdraw-event', item);
            },
        );

        await flushPromises();

        const scheduledDeposits =
            await testStorage.getItem('scheduled-deposits');
        const scheduledDeposit = scheduledDeposits?.[0];

        expect(scheduledDeposit.withdrawalId).toBeDefined();

        expect(scheduledDeposits).toEqual([
            {
                marketplaceData: {
                    type: 'auction',
                },
                marketplace: 'csgofloat',
                withdrawMarketplace: 'csgoempire',
                amountUsd: 68.45,
                assetId: 'test',
                withdrawalId: expect.any(String),
            },
        ]);
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

        // Start from previous test
        const item = new Item({
            marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
            marketId: 'test',
            priceUsd: 65.19,
            assetId: 'test',
        });

        const withdrawal = new Withdrawal({
            marketplace: 'csgoempire',
            marketplaceId: 'test',
            amountUsd: 65.19,
            item,
        });

        await appendStorageItem(testStorage, 'withdrawals', withdrawal);

        await testStorage.setItem('scheduled-deposits', [
            {
                marketplaceData: {
                    type: 'auction',
                },
                marketplace: 'csgofloat',
                withdrawMarketplace: 'csgoempire',
                amountUsd: 68.45,
                assetId: 'test',
                withdrawalId: withdrawal.id,
            },
        ]);

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', vi.fn()),
            plugins: [
                createCSGOFloatPlugin({
                    apiKey: 'test',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        // Go forward 8 days when the item is tradable
        vi.setSystemTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000));

        await checkScheduledDeposits(bot);

        await vi.waitUntil(() => testStorage.hasItem('deposits'));

        expect(depositMock).toHaveBeenCalledWith({
            asset_id: 'test',
            price: 6845,
            type: 'auction',
        });

        expect(await testStorage.getItem('deposits')).toEqual([
            {
                amountUsd: 68.45,
                id: expect.any(String),
                item: {
                    assetId: 'test',
                    marketId: 'test',
                    marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
                    priceUsd: 68.45,
                    auction: null,
                },
                madeAt: expect.any(String),
                marketplace: 'csgofloat',
            },
        ]);

        expect(await testStorage.getItem('scheduled-deposits')).toEqual([]);
    });
});
