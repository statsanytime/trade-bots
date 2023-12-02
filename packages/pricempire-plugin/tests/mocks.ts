import { http, HttpResponse } from 'msw';

export const mswItemPrices = http.get(
    'https://api.pricempire.com/v3/items/prices',
    () => HttpResponse.json({
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
