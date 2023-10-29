import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

export const storage = createStorage({
    driver: fsDriver({
        base: './tmp',
    }),
});

export async function appendStorageItem(key: string, item: any) {
    const curr = (await storage.getItem(key)) || [];

    if (!Array.isArray(curr)) {
        throw new Error(`Expected ${key} to be an array`);
    }

    await storage.setItem(key, [...curr, item]);
}
