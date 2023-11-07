import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    test,
    vi,
} from 'vitest';
import { setupServer } from 'msw/node';
import {
    createPricempirePlugin,
    getPrice,
} from '@statsanytime/trade-bots-pricempire';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
    Item,
    getContext,
    triggerEvent,
} from '@statsanytime/trade-bots';
import { flushPromises } from './utils.js';
import { mswItemPrices } from './mocks.js';

const mswServer = setupServer();

describe('Pricempire Plugin', () => {
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
                await triggerEvent('random-event', item);
            },
        );

        await flushPromises();

        expect(withdrawMock).toHaveBeenCalled();
    });
});
