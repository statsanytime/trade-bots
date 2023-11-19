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
