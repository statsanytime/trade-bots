import { vi } from 'vitest';
import SteamUser from 'steam-user';
import { LoginSession } from 'steam-session';
import TradeOfferManager from 'steam-tradeoffer-manager';

export const flushPromises = () =>
    new Promise((resolve) => setImmediate(resolve));

export function mockSteamTradeOfferManager() {
    const TradeOfferMock = {
        on: vi.fn(),
        setCookies: vi.fn(),
    };

    vi.spyOn(TradeOfferManager.prototype, 'on').mockImplementation(
        TradeOfferMock.on,
    );
    vi.spyOn(TradeOfferManager.prototype, 'setCookies').mockImplementation(
        TradeOfferMock.setCookies,
    );

    return TradeOfferMock;
}

export function mockSteamUser() {
    const SteamUserMock = {
        logOn: vi.fn(),
        on(event, cb) {
            if (event === 'loggedOn') {
                cb();
            }
        },
    };

    vi.spyOn(SteamUser.prototype, 'logOn').mockImplementation(
        SteamUserMock.logOn,
    );
    vi.spyOn(SteamUser.prototype, 'on').mockImplementation(SteamUserMock.on);

    return SteamUserMock;
}

export function mockSteamSession() {
    const SteamSessionMock = {
        startWithCredentials() {
            return Promise.resolve({
                actionRequired: false,
            });
        },
        on(event, cb) {
            if (event === 'authenticated') {
                cb();
            }
        },
        getWebCookies() {
            return Promise.resolve([]);
        },
    };

    vi.spyOn(LoginSession.prototype, 'startWithCredentials').mockImplementation(
        SteamSessionMock.startWithCredentials,
    );
    vi.spyOn(LoginSession.prototype, 'on').mockImplementation(
        SteamSessionMock.on,
    );
    vi.spyOn(LoginSession.prototype, 'getWebCookies').mockImplementation(
        SteamSessionMock.getWebCookies,
    );

    return SteamSessionMock;
}
