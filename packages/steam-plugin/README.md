# @statsanytime/trade-bots-steam

Official Steam plugin for the StatsAnytime Trade Bots framework.

## Installation

```bash
pnpm install @statsanytime/trade-bots-steam
```

## Usage

For information on how to use this in the context of the framework, we recommend reading the official framework documentation [here](https://github.com/statsanytime/trade-bots).

This package exports the following functions:

### `createSteamPlugin`

Creates a new Steam plugin instance. This takes a single options argument:

```typescript
export interface SteamPluginOptions {
    accountName: string;
    password: string;
    sharedSecret: string;
    identitySecret: string;
}
```

### `acceptTradeOffer`

Accepts a trade offer for the item in the current context. It does not take any arguments.
