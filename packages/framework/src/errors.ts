import consola from 'consola';

export class SilentError extends Error {
    constructor(message: string, originalError?: unknown) {
        super(message, {
            cause: originalError,
        });
    }
}

export function handleError(error: unknown) {
    if (error instanceof SilentError) {
        if (process.env.TRADE_BOTS_DEBUG) {
            consola.error('A silent error occured.', error);
        }

        return;
    }

    consola.error(
        'An unexpected error occurred. If you think this is related to this framework, please report it on https://github.com/statsanytime/trade-bots.',
        error,
    );
}
