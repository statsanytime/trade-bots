# @statsanytime/trade-bots-pricempire

Official Pricempire plugin for the StatsAnytime Trade Bots framework.

## Installation

```bash
pnpm install @statsanytime/trade-bots-pricempire
```

## Usage

For information on how to use this in the context of the framework, we recommend reading the official framework documentation [here](https://github.com/statsanytime/trade-bots).

This package exports the following functions:

### `createPricempirePlugin`

Creates a new Pricempire plugin instance. This takes a single options argument:

```typescript
export interface PricempirePluginOptions {
    apiKey: string;
    version: 'v2' | 'v3';
    sources: string[];
}
```

### `getPrice`

Returns the price of the item in the current context. It takes a single argument which should match the price attribute path:

```typescript
getPrice('buff_buy.random_price');
```

### `getPricePercentage`

Returns the price percentage of the item in the current context. It takes the same argument as `getPrice`:

```typescript
getPricePercentage('buff_buy.random_price');
```

As any example, if the price of the item is 90 USD and the buff price is 100 USD, this function will return 90.
