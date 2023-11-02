#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { cwd } from 'node:process';
import consola from 'consola';
import { startBots, Bot } from './index.js';

async function getBots(): Promise<{
    [name: string]: Bot;
}> {
    try {
        const path = `file:///${cwd()}/index.js`;
        const bots = await import(path);

        return bots;
    } catch (error) {
        consola.error(error);
        throw new Error(
            'Failed to retrieve bots from index.js. Make sure this file exists in the root directory of your project. If it does, please make an issue on the GitHub repository.',
        );
    }
}

const main = defineCommand({
    async run() {
        const bots = await getBots();

        await startBots(
            Object.entries(bots).map(([name, bot]) => {
                bot.name = name;

                return bot;
            }),
        );
    },
});

runMain(main);
