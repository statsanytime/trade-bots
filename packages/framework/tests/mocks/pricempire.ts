import { rest } from 'msw';

export const mswItemPrices = rest.get(
    'https://api.pricempire.com/v3/items/prices',
    (req, res, ctx) => {
        return res(
            ctx.json({
                'USP-S | Kill Confirmed (Minimal Wear)': {
                    buff_buy: {
                        isInflated: false,
                        price: 1000,
                        count: 18,
                        avg30: 16,
                        createdAt: '2023-09-23T12:42:46.690Z',
                    },
                },
            }),
        );
    },
);
