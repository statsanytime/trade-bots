import { describe, expect, test, vi } from 'vitest';
import TradeOfferMock from 'steam-tradeoffer-manager';
import { createSteamPlugin } from '@statsanytime/trade-bots-steam';
import { createPipeline, startBots, createBot } from '../src/index.ts';
import { flushPromises } from './utils.js';

vi.mock('steam-session', async () => {
    class LoginSessionMock {
        startWithCredentials() {
            return Promise.resolve({
                actionRequired: false,
            });
        }

        on(event, cb) {
            if (event === 'authenticated') {
                cb();
            }
        }

        getWebCookies() {
            return Promise.resolve([]);
        }
    }

    const actual = await vi.importActual('steam-session');

    return {
        LoginSession: LoginSessionMock,
        EAuthTokenPlatformType: actual.EAuthTokenPlatformType,
    };
});

vi.mock('steam-user', () => {
    class SteamUserMock {
        logOn = vi.fn();

        on(event, cb) {
            if (event === 'loggedOn') {
                cb();
            }
        }
    }

    return {
        default: SteamUserMock,
    };
});

vi.mock('steam-tradeoffer-manager', () => {
    const onMock = vi.fn();

    class TradeOfferManagerMock {
        on = onMock;

        setCookies = vi.fn();
    }

    return {
        default: TradeOfferManagerMock,
    };
});

describe('steam test', () => {
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

        const onManager = new TradeOfferMock().on;

        expect(onManager).toHaveBeenCalledTimes(1);
        expect(onManager).toHaveBeenCalledWith(
            'newOffer',
            expect.any(Function),
        );

        const onCallback = onManager.mock.calls[0][1];
        const acceptMock = vi.fn();

        onCallback({
            id: 'test',
            itemsToGive: [],
            itemsToReceive: [1],
            accept: acceptMock,
        });

        expect(acceptMock).toHaveBeenCalled();

        const newAcceptMock = vi.fn();

        onCallback({
            id: 'test',
            itemsToGive: [1],
            itemsToReceive: [],
            accept: newAcceptMock,
        });

        expect(newAcceptMock).not.toHaveBeenCalled();
    });
});
