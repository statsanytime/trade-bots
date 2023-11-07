import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSteamPlugin } from '@statsanytime/trade-bots-steam';
import { createPipeline, startBots, createBot } from '@statsanytime/trade-bots';
import {
    flushPromises,
    mockSteamSession,
    mockSteamTradeOfferManager,
    mockSteamUser,
} from './utils.js';

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
});
