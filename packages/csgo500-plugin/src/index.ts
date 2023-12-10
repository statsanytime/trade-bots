import { Plugin } from '@statsanytime/trade-bots';
import { createFetch } from 'ofetch';
import io, { Socket } from 'socket.io-client-v4';
import jwt from 'jsonwebtoken';
import type { CSGO500PluginOptions } from './types.js';
import Big from 'big.js';

const BUX_TO_USD_RATE = 1666;

export function buxToUsd(bux: number) {
    return new Big(bux).div(BUX_TO_USD_RATE).toNumber();
}

export function usdToBux(usd: number) {
    return new Big(usd).times(BUX_TO_USD_RATE).round(0).toNumber();
}

export const MARKETPLACE = 'csgo500';

export class CSGO500Plugin implements Plugin {
    name = 'csgo500';

    apiKey: string;

    userId: string;

    ofetch: ReturnType<typeof createFetch>;

    socket?: Socket;

    constructor(options: CSGO500PluginOptions) {
        this.apiKey = options.apiKey;
        this.userId = options.userId;
        this.ofetch = createFetch();
    }

    get authToken() {
        return jwt.sign({ userId: this.userId }, this.apiKey);
    }

    boot() {
        this.socket = io('wss://tradingapi.500.casino', {
            transports: ['websocket'],
            secure: true,
            auth: {
                'x-500-auth': this.authToken,
            },
        });
    }
}

export function createCSGO500Plugin(options: CSGO500PluginOptions) {
    return new CSGO500Plugin(options);
}

export * from './listeners.js';
export * from './withdraw.js';
