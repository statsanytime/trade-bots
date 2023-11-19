import { createStorage } from 'unstorage';
import memoryDriver from 'unstorage/drivers/memory';

export const testStorage = createStorage({
    driver: memoryDriver(),
});

export const flushPromises = () =>
    new Promise((resolve) => setImmediate(resolve));
