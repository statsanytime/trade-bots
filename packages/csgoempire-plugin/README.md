# @statsanytime/trade-bots-csgoempire

Official CSGOEmpire plugin for the StatsAnytime Trade Bots framework.

## Installation

```bash
pnpm install @statsanytime/trade-bots-csgoempire
```

## Usage

For information on how to use this in the context of the framework, we recommend reading the official framework documentation [here](https://github.com/statsanytime/trade-bots).

This package exports the following functions:

### `createCSGOEmpirePlugin`

Creates a new CSGOEmpire plugin instance. This takes a single options argument:

```typescript
export interface CSGOEmpirePluginOptions {
    apiKey: string;
}
```

### `withdraw`

Withdraws the item currently in the context (for example, the item that was just listed). This function does not take any arguments.

### `scheduleDeposit`

Schedules the deposit of a new item. The item in question is the one currently in the context (for example, the item that was just withdrawn). This function takes a single options argument:

```typescript
export interface CSGOEmpireScheduleDepositOptions {
    amountUsd: number;
}
```

### `deposit` / `depositMultiple`

This function makes a deposit request right away. It takes a single options argument:

```typescript
export interface ScheduledDeposit {
    marketplace: string;
    withdrawMarketplace: string;
    amountUsd: number;
    assetId: string;
    marketplaceData?: Record<string, any>;
    withdrawalId: string;
}
```

Under the hood, `scheduleDeposit` uses this function to make the deposit request once the item is tradable.

### `onItemBuyable`

Listen for items that become buyable. This function takes a single callback argument.
