# Introduction

Simple framework for building CS:GO trade-bots!

# Installation

We are currently in alpha so there is no official installation path for now. Feel free to manually install and play around with the packages, though.

## Official Plugins

-   `@statsanytime/trade-bots-csgoempire` - [CSGOEmpire plugin](packages/csgoempire-plugin)
-   `@statsanytime/trade-bots-csgofloat` - [CSGOFloat plugin](packages/csgofloat-plugin)
-   `@statsanytime/trade-bots-steam` - [Steam plugin](packages/steam-plugin)
-   `@statsanytime/trade-bots-pricempire` - [Pricempire plugin](packages/pricempire-plugin)
-   `@statsanytime/trade-bots-csgo500` - [CSGO500 plugin](packages/csgo500-plugin)

# Motivation

Trade bots should be simple. It should be possible to write code like this.

```javascript
import { createBot, createPipeline, listen } from '@statsanytime/trade-bots';
import { createCSGOFloatPlugin, scheduleDeposit } from '@statsanytime/trade-bots-csgofloat';
import { createCSGOEmpirePlugin, withdraw } from '@statsanytime/trade-bots-csgoempire';
import { createSteamPlugin, acceptTradeOffer } from '@statsanytime/trade-bots-steam';
import { createPricempirePlugin, getPrice } from '@statsanytime/trade-bots-pricempire';

const RedepositorPipeline = createPipeline('Redepositor', function () {
    listen('csgoempire:item-buyable', async (item) => {
        if (item.priceUsd <= getPrice('buff_buy')) {
            await withdraw();

            await acceptTradeOffer();

            await scheduleDeposit({
                amountUsd: this.item.priceUsd * 1.05,
            });
        }
    });
});

export const bot1 = createBot({
    pipeline: RedepositorPipeline,
    plugins: [
        createCSGOEmpirePlugin(...),
        createPricempirePlugin(...),
        createSteamPlugin(...),
        createCSGOFloatPlugin(...),
    ],
});
```

# Structure

The main logic is kept in the `@statsanytime/trade-bots` package which is available in the `packages/framework` folder in this repository.

Aside from this, there are some official plugins available for integration with other services. These are available in the `packages` folder in this repository.
