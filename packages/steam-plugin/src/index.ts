import { Plugin, getContext, useContext } from '@statsanytime/trade-bots';
// @ts-ignore
import SteamUser from 'steam-user';
// @ts-ignore
import SteamCommunity from 'steamcommunity';
// @ts-ignore
import TradeOfferManager from 'steam-tradeoffer-manager';
// @ts-ignore
import SteamTotp from 'steam-totp';
import {
    LoginSession,
    EAuthTokenPlatformType,
    EAuthSessionGuardType,
} from 'steam-session';
import consola from 'consola';
import util from 'util';
import { SteamPluginOptions } from './types.js';

export class SteamPlugin implements Plugin {
    name = 'steam';
    options: SteamPluginOptions;
    user: SteamUser | undefined;
    community: SteamCommunity | undefined;
    manager: TradeOfferManager | undefined;

    constructor(options: SteamPluginOptions) {
        this.options = options;
    }

    async boot() {
        this.user = new SteamUser();
        this.community = new SteamCommunity();

        this.manager = new TradeOfferManager({
            steam: this.user,
            community: this.community,
            language: 'en',
        });

        await this.login();
    }

    async getSession(): Promise<LoginSession> {
        const context = useContext();

        const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
        const savedRefreshToken = await context.bot.storage.getItem(
            'steam-refresh-token',
        );

        // If we already have a refresh token, let's use it to resume the session
        if (savedRefreshToken) {
            session.refreshToken = savedRefreshToken as string;

            return session;
        }

        let startResult = await session.startWithCredentials({
            accountName: this.options.accountName,
            password: this.options.password,
        });

        if (startResult.actionRequired) {
            if (
                !startResult.validActions ||
                !startResult.validActions.some(
                    (action) =>
                        action.type === EAuthSessionGuardType.DeviceCode,
                )
            ) {
                throw new Error(
                    'Device code is not a valid action for signing in.',
                );
            }

            let code = SteamTotp.getAuthCode(this.options.sharedSecret);

            await session.submitSteamGuardCode(code);
        }

        await this.authenticateSession(session);

        return session;
    }

    async authenticateSession(session: LoginSession): Promise<LoginSession> {
        return new Promise(async (resolve, reject) => {
            session.on('authenticated', async () => {
                return resolve(session);
            });

            session.on('timeout', () => {
                reject('Steam session timed out');
            });

            session.on('error', (err: any) => {
                reject(err);
            });
        });
    }

    async refreshWebCookies(session: LoginSession) {
        let webCookies = await session.getWebCookies();

        let managerSetCookiesFn = util.promisify(
            this.manager.setCookies.bind(this.manager),
        );

        try {
            await managerSetCookiesFn(webCookies);
        } catch (err) {
            consola.error('Failed to set cookies for steam trade manager');
            consola.error(err);
        }
    }

    async login() {
        const context = useContext();

        let session = await this.getSession();

        await context.bot.storage.setItem(
            'steam-refresh-token',
            session.refreshToken,
        );

        this.user.logOn({
            refreshToken: session.refreshToken,
        });

        this.user.on('loggedOn', async () => {
            await this.refreshWebCookies(session);
        });

        this.user.on('error', async (err: any) => {
            consola.error('An error occurred while logging in');
            consola.error(err);
        });

        this.community.on('sessionExpired', async (err: any) => {
            consola.error(err);

            await this.refreshWebCookies(session);
        });

        this.manager.on('newOffer', async (offer: any) => {
            if (offer.itemsToGive.length > 0) {
                return;
            }

            const acceptOfferFn = util.promisify(offer.accept.bind(offer));

            try {
                await acceptOfferFn();

                context.bot.hooks.callHook('steam:offer-accepted', offer);
            } catch (err) {
                consola.error(err);
            }
        });
    }
}

export function acceptTradeOffer() {
    const contextObj = getContext();
    const context = useContext();

    if (!context.item) {
        throw new Error(
            'No item is defined in the context. Make sure an item has been listened for and withdrawn.',
        );
    }

    if (!context.withdrawal) {
        throw new Error(
            'No withdrawal is defined in the context. Make sure a withdrawal has been listened for and withdrawn.',
        );
    }

    return new Promise((resolve, reject) => {
        // If no offer is found after 24 hours, reject the promise
        const timeout = setTimeout(
            () => {
                reject('No matching item accepted after 24 hours');
            },
            24 * 60 * 60 * 1000,
        );
    
        async function handleAcceptedOffer(offer: any) {
            // Get the "new" received items, a.k.a. the item with the updated assetid
            const receivedItemsFn = util.promisify(
                offer.getReceivedItems.bind(offer),
            );
            const receivedItems = await receivedItemsFn();

            const localateItem = (item: any) =>
                item.market_hash_name === context.item?.marketName;

            const oldMatchingItem = offer.itemsToReceive.find(localateItem);
            const matchingItem = receivedItems.find(localateItem);

            if (matchingItem) {
                // TODO: We should probably not have to update both places here
                context.item!.assetId = matchingItem.assetid;
                context.item!.previousAssetId = oldMatchingItem?.assetid;
                context.withdrawal!.item.assetId = matchingItem.assetid;
                context.withdrawal!.item.previousAssetId = oldMatchingItem?.assetid;
                await context.withdrawal!.save();

                resolve(null);
                clearTimeout(timeout);
            }
        }

        context.bot.hooks.hook('steam:offer-accepted', (offer: any) => {
            // Resume context
            contextObj.call(context, () => handleAcceptedOffer(offer));
        });
    });
}

export function createSteamPlugin(options: SteamPluginOptions) {
    return new SteamPlugin(options);
}
