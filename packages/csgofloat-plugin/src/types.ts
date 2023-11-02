export interface CSGOFloatScheduleDepositOptions {
    amountUsd: number;
    type?: 'buy_now' | 'auction';
    maxOfferDiscount?: number;
    reservePrice?: number;
    durationDays?: 1 | 3 | 5 | 7 | 14;
    description?: string;
    private?: boolean;
}

export interface CSGOFloatPluginOptions {
    apiKey: string;
    version?: 'v1';
}
