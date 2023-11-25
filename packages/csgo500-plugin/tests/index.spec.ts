import {
    Mock,
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    test,
    vi,
} from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createCSGO500Plugin, withdraw } from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    listen,
} from '@statsanytime/trade-bots';
import { testStorage, flushPromises } from '@statsanytime/trade-bots-shared';
import io from 'socket.io-client-v4';
import { marketListingUpdateEvent } from './mocks.js';

vi.mock('socket.io-client-v4', () => {
    const onMock = vi.fn();
    const offMock = vi.fn();
    const emitMock = vi.fn();

    return {
        default: vi.fn(() => ({
            on: onMock,
            off: offMock,
            emit: emitMock,
        })),
    };
});

const mswServer = setupServer();

describe('CSGO500 Plugin', () => {
    beforeAll(() => mswServer.listen());

    afterEach(() => {
        vi.restoreAllMocks();
        mswServer.resetHandlers();
    });

    afterAll(() => mswServer.close());

    test('listening for events works', async () => {
        const listenFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgo500:item-buyable', listenFn);
            }),
            plugins: [
                createCSGO500Plugin({
                    apiKey: 'testApiKey',
                    userId: 'testUserId',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(io).toHaveBeenCalledWith('wss://tradingapi.500.casino', {
            transports: ['websocket'],
            secure: true,
            auth: {
                'x-500-auth': expect.any(String),
            },
        });

        const onMock = io().on as Mock;

        expect(onMock).toHaveBeenCalledWith(
            'market_listing_update',
            expect.any(Function),
        );

        const [eventName, listenCallback] = onMock.mock.calls[0];

        await listenCallback(marketListingUpdateEvent);

        expect(listenFn).toHaveBeenCalledWith(
            expect.objectContaining({
                marketId: marketListingUpdateEvent.listing.id,
                marketName: marketListingUpdateEvent.listing.name,
            }),
        );
    });

    test('withdraw works', async () => {
        const withdrawSpy = vi.fn();

        mswServer.use(
            rest.post(
                'https://tradingapi.500.casino/api/v1/market/withdraw',
                async (req, res, ctx) => {
                    withdrawSpy(await req.json());

                    return res(
                        ctx.json({
                            success: true,
                            data: {
                                listing: {
                                    id: 'test',
                                },
                            },
                        }),
                    );
                },
            ),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                listen('csgo500:item-buyable', function () {
                    withdraw();
                });
            }),
            plugins: [
                createCSGO500Plugin({
                    apiKey: 'testApiKey',
                    userId: 'testUserId',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        const onMock = io().on as Mock;
        const [eventName, listenCallback] = onMock.mock.calls[0];

        await listenCallback(marketListingUpdateEvent);

        await flushPromises();
        await flushPromises();

        expect(withdrawSpy).toHaveBeenCalledWith({
            listingId: '654a9048383f113fc528188c',
            listingValue: 17820,
            selectedBalance: 'bux',
        });

        expect(await testStorage.getItem('withdrawals')).toEqual([
            {
                amountUsd: 10.696278511404563,
                id: expect.any(String),
                item: {
                    auction: null,
                    marketId: '654a9048383f113fc528188c',
                    marketName: 'M4A4 | In Living Color (Minimal Wear)',
                    priceUsd: 10.696278511404563,
                },
                madeAt: expect.any(String),
                marketplace: 'csgo500',
                marketplaceId: 'test',
            },
        ]);
    });
});
