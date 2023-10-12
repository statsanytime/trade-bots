import { Plugin } from '@statsanytime/trade-bots';
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
import util from 'util';
import { SteamPluginOptions } from './types.js';

class SteamPlugin implements Plugin {
    options: SteamPluginOptions;
    user: SteamUser;
    community: SteamCommunity;
    manager: TradeOfferManager;

    constructor(options: SteamPluginOptions) {
        this.options = options;
    }

    boot() {
        this.user = new SteamUser();
        this.community = new SteamCommunity();

        this.manager = new TradeOfferManager({
            steam: this.user,
            community: this.community,
            language: 'en',
        });

        this.login();
    }

    async getSession(): Promise<LoginSession> {
        let session = new LoginSession(EAuthTokenPlatformType.SteamClient);

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
            console.error('Failed to set cookies for steam trade manager');
            console.error(err);
        }
    }

    async login() {
        let session = await this.getSession();

        await this.authenticateSession(session);

        this.user.logOn({
            refreshToken: session.refreshToken,
        });

        this.user.on('loggedOn', async () => {
            await this.refreshWebCookies(session);
        });

        this.user.on('error', async (err: any) => {
            console.error('An error occurred while logging in');
            console.error(err);
        });

        this.community.on('sessionExpired', async (err: any) => {
            console.error(err);

            await this.refreshWebCookies(session);
        });

        this.manager.on('newOffer', async (offer: any) => {
            if (offer.itemsToGive.length > 0) {
                return;
            }

            const acceptOfferFn = util.promisify(offer.accept.bind(offer));

            try {
                await acceptOfferFn();
            } catch (err) {
                console.error(err);
            }
        });
    }
}

export function createSteamPlugin(options: SteamPluginOptions) {
    return new SteamPlugin(options);
}
