# @statsanytime/trade-bots-csgo500

Official CSGO500 plugin for the StatsAnytime Trade Bots framework.

## Installation

```bash
pnpm install @statsanytime/trade-bots-csgo500
```

## Usage

For information on how to use this in the context of the framework, we recommend reading the official framework documentation [here](https://github.com/statsanytime/trade-bots).

This package exports the following functions:

### `createCSGO500Plugin`

Creates a new CSGO500 plugin instance. This takes a single options argument:

```typescript
export interface CSGO500PluginOptions {
    apiKey: string;
    userId: string;
}
```

### `withdraw`

Withdraws the item currently in the context (for example, the item that was just listed). This function does not take any arguments.

### `onItemBuyable`

Listen for items that become buyable. This function takes a single callback argument.
