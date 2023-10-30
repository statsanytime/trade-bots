# Introduction

Simple framework for building CS:GO trade-bots!

# Installation

We're not here quite yet. Check back soon!

# Motivation

Trade bots should be simple. It should be possible to write code like this.

```javascript
// index.js
import { createBot } from '@statsanytime/trade-bots';
import RedepositorPipeline from './pipelines/redepositor.js';

export const bot1 = createBot({
    pipeline: RedepositorPipeline,
});
```

```javascript
// pipelines/redepositor.js
import { createPipeline, listen } from '@statsanytime/trade-bots';
import { scheduleDeposit } from '@statsanytime/trade-bots-csgofloat';
import { withdraw } from '@statsanytime/trade-bots-csgoempire';
import { acceptTradeOffer } from '@statsanytime/trade-bots-steam';
import { getPrice } from '@statsanytime/trade-bots-pricempire';

export const RedepositorPipeline = createPipeline('Redepositor', function () {
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
```

# Structure

The main logic is kept in the `@statsanytime/trade-bots` package which is available in the `packages/framework` folder in this repository.

Any apps you create should use this package as a dependency. An example of this can be found within `packages/redepositor`.
