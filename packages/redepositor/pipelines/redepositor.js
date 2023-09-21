import { createPipeline } from '@statsanytime/trade-bots';

export const RedepositorPipeline = createPipeline('Redepositor', function () {
    this.listen('csgoempire:item-buyable', async (item) => {
        console.log(item);
    });
});
