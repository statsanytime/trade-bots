# @statsanytime/trade-bots-csgofloat

Official CSGOFloat plugin for the StatsAnytime Trade Bots framework.

## Installation

```bash
pnpm install @statsanytime/trade-bots-csgofloat
```

## Usage

For information on how to use this in the context of the framework, we recommend reading the official framework documentation [here](https://github.com/statsanytime/trade-bots).

This package exports the following functions:

### `createCSGOFloatPlugin`

Creates a new CSGOFloat plugin instance. This takes a single options argument:

```typescript
export interface CSGOFloatPluginOptions {
    apiKey: string;
    version?: 'v1';
}
```

### `scheduleDeposit`

Schedules the deposit of a new item. The item in question is the one currently in the context (for example, the item that was just withdrawn). This function takes a single options argument:

```typescript
export interface CSGOFloatScheduleDepositOptions {
    amountUsd: number;
    type?: 'buy_now' | 'auction';
    maxOfferDiscount?: number;
    reservePrice?: number;
    durationDays?: 1 | 3 | 5 | 7 | 14;
    description?: string;
    private?: boolean;
}
```

### `deposit`

This function makes a deposit request right away. It takes a single options argument:

```typescript
export interface ScheduledDeposit {
    marketplace: string;
    withdrawMarketplace: string;
    amountUsd: number;
    assetId: string;
    marketplaceData?: Record<string, any>;
    withdrawnAt: string;
}
```

Under the hood, `scheduleDeposit` uses this function to make the deposit request once the item is tradable.
