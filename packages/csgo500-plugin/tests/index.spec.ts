import {
    Mock,
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
import { http, HttpResponse } from 'msw';
import { createCSGO500Plugin, withdraw, onItemBuyable } from '../src/index.js';
import { createPipeline, startBots, createBot } from '@statsanytime/trade-bots';
import { testStorage, flushPromises } from '@statsanytime/trade-bots-shared';
import io from 'socket.io-client-v4';
import { auctionUpdateEvent, marketListingUpdateEvent } from './mocks.js';

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
                onItemBuyable(listenFn);
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

        const [eventName, listenCallback] = onMock.mock.calls.find(
            (args) => args[0] === 'market_listing_update',
        );

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
            http.post(
                'https://tradingapi.500.casino/api/v1/market/withdraw',
                async ({ request }) => {
                    withdrawSpy(await request.json());

                    return HttpResponse.json({
                        success: true,
                        data: {
                            listing: {
                                id: 'test',
                            },
                        },
                    });
                },
            ),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(function () {
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
        const [eventName, listenCallback] = onMock.mock.calls.find(
            (args) => args[0] === 'market_listing_update',
        );

        await listenCallback(marketListingUpdateEvent);
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
                    marketId: '654a9048383f113fc528188c',
                    marketName: 'M4A4 | In Living Color (Minimal Wear)',
                    priceUsd: 10.696278511404563,
                    auction: {
                        bidCount: 1,
                        endsAt: '2023-11-07T19:30:25.420Z',
                        highestBid: 10.696278511404563,
                        highestBidder: '654a71a8572da5ffc15760e4',
                    },
                },
                madeAt: expect.any(String),
                marketplace: 'csgo500',
                marketplaceId: 'test',
            },
        ]);
    });

    it('correctly listens to auction updates', async () => {
        const bidSpy = vi.fn();

        mswServer.use(
            http.post(
                'https://tradingapi.500.casino/api/v1/market/auction/bid',
                async ({ request }) => {
                    bidSpy(await request.json());

                    return HttpResponse.json({});
                },
            ),
        );

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', function () {
                onItemBuyable(function () {
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
        const [eventName, listenCallback] = onMock.mock.calls.find(
            (args) => args[0] === 'market_listing_auction_update',
        );

        await listenCallback(auctionUpdateEvent);
        await flushPromises();

        expect(bidSpy).toHaveBeenCalledWith({
            listingId: '654a9048383f113fc528188c',
            bidValue: 18176,
            selectedBalance: 'bux',
        });
    });
});
