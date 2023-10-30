import type { Pipeline } from './types.js';

export function createPipeline(name: string, handler: () => void): Pipeline {
    return {
        name,
        handler,
    };
}
