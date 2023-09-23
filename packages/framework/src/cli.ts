#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { cwd } from 'node:process';
import { startBots } from './index.js';
import type { Bot } from './types.js';

async function getBots(): Promise<{
    [name: string]: Omit<Bot, 'name'>;
}> {
    try {
        const path = `file:///${cwd()}/index.js`;
        const bots = await import(path);

        return bots;
    } catch (error) {
        console.error(error);
        throw new Error(
            'Failed to retrieve bots from index.js. Make sure this file exists in the root directory of your project. If it does, please make an issue on the GitHub repository.',
        );
    }
}

const main = defineCommand({
    async run() {
        const bots = await getBots();

        await startBots(
            Object.entries(bots).map(([name, botOptions]) => ({
                name,
                ...botOptions,
            })),
        );
    },
});

runMain(main);
