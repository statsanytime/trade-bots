import {
    Plugin,
    ScheduledDeposit,
    useContext,
    removeScheduledDeposit,
} from '@statsanytime/trade-bots';
import { createFetch } from 'ofetch';
import consola from 'consola';
import { CSGOFloatPluginOptions } from './types.js';
import { deposit } from './deposit.js';

export const MARKETPLACE = 'csgofloat';

export class CSGOFloatPlugin implements Plugin {
    name = 'csgofloat';

    apiKey: string;

    version: 'v1';

    ofetch: ReturnType<typeof createFetch>;

    constructor(options: CSGOFloatPluginOptions) {
        this.apiKey = options.apiKey;
        this.version = options.version ?? 'v1';
        this.ofetch = createFetch();
    }

    boot() {
        const context = useContext();

        context.bot.hooks.hook(
            'deposit-redepositable',
            async (depositObject: ScheduledDeposit) => {
                if (depositObject.marketplace !== MARKETPLACE) {
                    return;
                }

                try {
                    await deposit(depositObject);
                    await removeScheduledDeposit(depositObject);
                } catch (err) {
                    consola.error(err);
                    consola.error('Failed to deposit item', depositObject);
                }
            },
        );
    }
}

export function createCSGOFloatPlugin(options: CSGOFloatPluginOptions) {
    return new CSGOFloatPlugin(options);
}

export * from './deposit.js';
