import { vi } from 'vitest';
import SteamUser from 'steam-user';
import { LoginSession } from 'steam-session';
import TradeOfferManager from 'steam-tradeoffer-manager';
import CSGOEmpire from 'csgoempire-wrapper';

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
                cb(null);
            }

            return this;
        },
        getWebCookies() {
            return Promise.resolve([]);
        },
    } as Pick<
        typeof LoginSession.prototype,
        'startWithCredentials' | 'on' | 'getWebCookies'
    >;

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

export function mockCSGOEmpire() {
    const listeners = {};
    const sockets = {};

    vi.spyOn(
        CSGOEmpire.prototype,
        'connectAndAuthenticateSocket',
    ).mockImplementation(function (key) {
        sockets[key] = {
            on: vi.fn((event, cb) => {
                listeners[`${key}:${event}`] = cb;
            }),
        };

        this.sockets[key] = sockets[key];

        return this.sockets[key];
    });

    const makeWithdrawalSpy = vi.spyOn(CSGOEmpire.prototype, 'makeWithdrawal');

    return {
        listeners,
        sockets,
        makeWithdrawalSpy,
    };
}
