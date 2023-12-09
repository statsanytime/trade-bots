import { vi } from 'vitest';
import CSGOEmpire from 'csgoempire-wrapper';

export function mockCSGOEmpire() {
    const listeners = {};
    const sockets = {};

    vi.spyOn(
        CSGOEmpire.prototype,
        'connectAndAuthenticateSocket',
    ).mockImplementation(function (key) {
        sockets[key] = {
            on: vi.fn((event, cb) => {
                if (!listeners[`${key}:${event}`]) {
                    listeners[`${key}:${event}`] = [];
                }

                listeners[`${key}:${event}`].push(cb);
            }),
            off: vi.fn((event, cb) => {
                if (!listeners[`${key}:${event}`]) {
                    return;
                }

                listeners[`${key}:${event}`] = listeners[
                    `${key}:${event}`
                ].filter((listener: Function) => listener !== cb);
            }),
        };

        this.sockets[key] = sockets[key];

        return this.sockets[key];
    });

    const makeWithdrawalSpy = vi.spyOn(CSGOEmpire.prototype, 'makeWithdrawal');

    const placeBidSpy = vi.spyOn(CSGOEmpire.prototype, 'placeBid');

    function callListener(key: string, ...args: any[]) {
        if (!listeners[key]) {
            return;
        }

        listeners[key].forEach((listener: Function) => listener(...args));
    }

    return {
        listeners,
        callListener,
        sockets,
        makeWithdrawalSpy,
        placeBidSpy,
    };
}
