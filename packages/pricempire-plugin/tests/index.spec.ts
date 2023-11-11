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
import fs from 'node:fs/promises';
import {
    createPricempirePlugin,
    getPrice,
    getPricePercentage,
} from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
    Item,
    getContext,
    callContextHook,
    handleError,
} from '@statsanytime/trade-bots';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { flushPromises } from './utils.js';
import { mswItemPrices } from './mocks.js';

const mswServer = setupServer();

describe('Pricempire Plugin', () => {
    let writeFileSpy;

    beforeEach(() => {
        vi.spyOn(fs, 'readFile').mockResolvedValue('{}');
        vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

        writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    });

    beforeAll(() => mswServer.listen());

    afterEach(() => {
        vi.resetAllMocks();
        mswServer.resetHandlers();
    });

    afterAll(() => mswServer.close());

    test('price sources work', async () => {
        mswServer.use(mswItemPrices);

        const withdrawMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                listen('random-event', () => {
                    if (getPrice('buff_buy') === 10) {
                        withdrawMock();
                    }
                });
            }),
            plugins: [
                createPricempirePlugin({
                    apiKey: 'testApiKey',
                    sources: ['buy_order'],
                    version: 'v3',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        const cachedPrices = JSON.parse(
            writeFileSpy.mock.calls[0][1] as string,
        );

        expect(writeFileSpy).toHaveBeenCalledWith(
            resolve(cwd(), './.statsanytime/pricempire-prices'),
            JSON.stringify({
                prices: {
                    'USP-S | Kill Confirmed (Minimal Wear)': {
                        buff_buy: {
                            isInflated: false,
                            price: 1000,
                            count: 18,
                            avg30: 16,
                            createdAt: '2023-09-23T12:42:46.690Z',
                        },
                    },
                },
                cachedAt: cachedPrices.cachedAt,
            }),
            'utf8',
        );

        // Call it as if an event was triggered
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
                marketplace: 'csgoempire',
            },
            async () => {
                try {
                    await callContextHook('random-event', item);
                } catch (err) {
                    handleError(err);
                }
            },
        );

        await flushPromises();

        expect(withdrawMock).toHaveBeenCalled();
    });

    test('getPercentageOfPrice', async () => {
        mswServer.use(mswItemPrices);

        const withdrawMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                listen('random-event', () => {
                    if (getPricePercentage('buff_buy') <= 98) {
                        withdrawMock();
                    }
                });
            }),
            plugins: [
                createPricempirePlugin({
                    apiKey: 'testApiKey',
                    sources: ['buy_order'],
                    version: 'v3',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        // Call it as if an event was triggered
        const item = new Item({
            marketName: 'USP-S | Kill Confirmed (Minimal Wear)',
            marketId: 'test',
            priceUsd: 9.8,
            assetId: 'test',
        });

        getContext().call(
            {
                bot,
                item,
                marketplace: 'csgoempire',
            },
            async () => {
                try {
                    await callContextHook('random-event', item);
                } catch (err) {
                    handleError(err);
                }
            },
        );

        await flushPromises();

        expect(withdrawMock).toHaveBeenCalled();
    });

    test('getPercentageOfPrice missing item', async () => {
        mswServer.use(mswItemPrices);

        const withdrawMock = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', () => {
                listen('random-event', () => {
                    if (getPricePercentage('buff_buy') <= 98) {
                        withdrawMock();
                    }
                });
            }),
            plugins: [
                createPricempirePlugin({
                    apiKey: 'testApiKey',
                    sources: ['buy_order'],
                    version: 'v3',
                }),
            ],
        });

        startBots([bot]);

        await flushPromises();

        // Call it as if an event was triggered
        const item = new Item({
            marketName: 'Item that does not exist',
            marketId: 'test',
            priceUsd: 9.8,
            assetId: 'test',
        });

        getContext().call(
            {
                bot,
                item,
                marketplace: 'csgoempire',
            },
            async () => {
                try {
                    await callContextHook('random-event', item);
                } catch (err) {
                    handleError(err);
                }
            },
        );

        await flushPromises();

        expect(withdrawMock).not.toHaveBeenCalled();
    });
});
