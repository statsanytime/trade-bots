import { createStorage } from 'unstorage';
import memoryDriver from 'unstorage/drivers/memory';
import { useContext } from '@statsanytime/trade-bots';

export const testStorage = createStorage({
    driver: memoryDriver(),
});

export const flushPromises = () =>
    new Promise((resolve) => setImmediate(resolve));

export function onCustomEvent(event: string, callback: Function) {
    const context = useContext();

    context.bot.registerListener(event, callback);
}
