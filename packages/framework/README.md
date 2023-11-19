# @statsanytime/trade-bots

Main package for the trade-bots framework. This package exports the main logic for creating, starting and managing trade-bots.

Most other packages in this repository are plugins for this package.

## Installation

```bash
pnpm install @statsanytime/trade-bots
```

## Usage

This package exports the following functions:

### `createBot`

Creates a new Bot instance.

```typescript
export interface BotOptions {
    name: string | undefined;
    pipeline: Pipeline;
    plugins: Plugin[];
    storage?: Storage;
}

const bot = createBot({
    name: 'my-bot',
    pipeline: createPipeline(...),
    plugins: [
        ...
    ],
});
```

### `createPipeline`

Create a new Pipeline instance.

```typescript
const pipeline = createPipeline('my-pipeline', () => {
    // Pipeline logic
});
```

### `startBots`

Can be used to start bots. It accepts an array of bot instances.

Alternatively, the `stattb` CLI can be used to do this.

```typescript
startBots([bot1, bot2, ...]);
```

### `listen`

Can be used for listening for events from bots inside the pipeline context/logic.

```typescript
listen('event-name', (eventData) => {
    // Event handler
});
```

There are quite a few available functions on top of these, but these are the stable ones for the time being. Feel free to play around with the more internal functions, but be aware that they might change in the future.
