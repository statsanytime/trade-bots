import { beforeEach, describe, expect, test, vi } from 'vitest';
import { acceptTradeOffer, createSteamPlugin } from '../src/index.js';
import {
    createPipeline,
    startBots,
    createBot,
    useContext,
    Withdrawal,
    Item,
} from '@statsanytime/trade-bots';
import { testStorage, flushPromises } from '@statsanytime/trade-bots-shared';
import {
    mockSteamSession,
    mockSteamTradeOfferManager,
    mockSteamUser,
} from './utils.js';
import { EIconBase } from './mocks.js';

describe('Steam Plugin', () => {
    let TradeOfferMock: any;

    beforeEach(() => {
        TradeOfferMock = mockSteamTradeOfferManager();
        mockSteamUser();
        mockSteamSession();
    });

    test('steam plugin works', async () => {
        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', vi.fn()),
            plugins: [
                createSteamPlugin({
                    accountName: 'test',
                    password: 'test',
                    sharedSecret: 'test',
                    identitySecret: 'test',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(TradeOfferMock.on).toHaveBeenCalledTimes(1);
        expect(TradeOfferMock.on).toHaveBeenCalledWith(
            'newOffer',
            expect.any(Function),
        );

        const onCallback = TradeOfferMock.on.mock.calls[0][1];
        const acceptMock = vi.fn((cb) => {
            cb(null, 'completed');
        });

        onCallback({
            id: 'test',
            itemsToGive: [],
            itemsToReceive: [1],
            accept: acceptMock,
        });

        expect(acceptMock).toHaveBeenCalled();

        const newAcceptMock = vi.fn((cb) => {
            cb(null, 'completed');
        });

        onCallback({
            id: 'test',
            itemsToGive: [1],
            itemsToReceive: [],
            accept: newAcceptMock,
        });

        expect(newAcceptMock).not.toHaveBeenCalled();
    });

    test('correctly sets asset ids', async () => {
        const contextFn = vi.fn();

        const bot = createBot({
            name: 'test',
            pipeline: createPipeline('test', async () => {
                // Pretend withdrawal has been made
                const context = useContext();
                context.item = new Item({
                    marketId: 'some-market-id',
                    marketName: 'Market Name',
                    priceUsd: 150.12,
                });
                context.withdrawal = new Withdrawal({
                    marketplace: 'some-marketplace',
                    marketplaceId: 'some-marketplace-id',
                    item: context.item!,
                    amountUsd: context.item!.priceUsd,
                });

                await acceptTradeOffer();

                contextFn(useContext());
            }),
            plugins: [
                createSteamPlugin({
                    accountName: 'test',
                    password: 'test',
                    sharedSecret: 'test',
                    identitySecret: 'test',
                }),
            ],
            storage: testStorage,
        });

        startBots([bot]);

        await flushPromises();

        expect(TradeOfferMock.on).toHaveBeenCalledWith(
            'newOffer',
            expect.any(Function),
        );

        const onCallback = TradeOfferMock.on.mock.calls[0][1];
        const acceptMock = vi.fn((cb) => {
            cb(null, 'completed');
        });

        onCallback({
            id: 'test',
            itemsToGive: [],
            itemsToReceive: [EIconBase],
            accept: acceptMock,
            getReceivedItems: vi.fn((cb) => {
                cb(null, [
                    {
                        ...EIconBase,
                        id: '12345',
                        assetid: '12345',
                    },
                ]);
            }),
        });

        await flushPromises();

        expect(contextFn).toHaveBeenCalledWith({
            bot,
            withdrawal: expect.any(Withdrawal),
            item: new Item({
                assetId: '12345',
                previousAssetId: '1234',
                marketId: 'some-market-id',
                marketName: 'Market Name',
                priceUsd: 150.12,
            }),
        });
    });
});
