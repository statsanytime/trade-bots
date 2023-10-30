# Introduction

Simple framework for building CS:GO trade-bots!

# Installation

We're not here quite yet. Check back soon!

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

Any apps you create should use this package as a dependency. An example of this can be found within `packages/redepositor`.
