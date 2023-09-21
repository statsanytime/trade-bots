# Introduction

Simple framework for building CS:GO trade-bots!

# Installation

We're not here quite yet. Check back soon!

# Motivation

Trade bots should be simple. It should be possible to write code like this.

```javascript
// index.js
import RedepositorPipeline from './pipelines/redepositor.js';

export const bot1 = {
    pipeline: RedepositorPipeline,
};
```

```javascript
// pipelines/redepositor.js
import { createPipeline } from '@statsanytime/trade-bots';

export const RedepositorPipeline = createPipeline('Redepositor', function () {
    this.listen('csgoempire:item-buyable', async (item) => {
        if (item.priceUsd <= item.priceSources.buff163.buyOrdersUsd) {
            await this.withdraw();

            await this.scheduleDeposit('csgofloat', {
                amountUsd: this.item.priceUsd * 1.05,
            });
        }
    });
});
```

# Structure

The main logic is kept in the `@statsanytime/trade-bots` package which is available in the `packages/framework` folder in this repository.

Any apps you create should use this package as a dependency. An example of this can be found within `packages/redepositor`.
