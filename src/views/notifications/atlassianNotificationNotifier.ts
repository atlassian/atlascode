import { AuthInfo, ProductJira } from '../../atlclients/authInfo';
import { graphqlRequest } from '../../atlclients/graphql/graphqlClient';
import { notificationFeedVSCode, unseenNotificationCountVSCode } from '../../atlclients/graphql/graphqlDocuments';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { AtlasCodeNotification, NotificationNotifier } from './notificationManager';

export class AtlassianNotificationNotifier implements NotificationNotifier {
    private static instance: AtlassianNotificationNotifier;

    private _lastUnseenNotificationCount: number = -1;
    private _lastNotificationSoftPull: number = 0;
    private _lastDetailPull: number = 0;
    private static readonly NOTIFICATION_INTERVAL_MS = 60 * 1000; // 1 minute
    private static readonly FORCE_DETAILS_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

    public static getInstance(): AtlassianNotificationNotifier {
        if (!AtlassianNotificationNotifier.instance) {
            AtlassianNotificationNotifier.instance = new AtlassianNotificationNotifier();
        }
        return AtlassianNotificationNotifier.instance;
    }
    private constructor() {}

    public fetchNotifications(): void {
        Container.credentialManager.getAllValidAuthInfo(ProductJira).then((authInfos: AuthInfo[]) => {
            authInfos.forEach(async (authInfo: AuthInfo) => {
                if (await this.shouldGetNotificationDetails(authInfo)) {
                    this.getNotificationDetails(authInfo);
                }
            });
        });
    }

    private async shouldGetNotificationDetails(authInfo: AuthInfo): Promise<boolean> {
        if (this.shouldRateLimit(authInfo)) {
            return false;
        }

        if (this.isNotificationDetailRefreshNeeded(authInfo)) {
            return true;
        }

        if (await this.hasChangedUnseenNotifications(authInfo)) {
            return true;
        }

        return false;
    }

    private getNotificationDetails(authInfo: AuthInfo): void {
        this._lastDetailPull = Date.now();
        this.getNotificationDetailsByAuthInfo(authInfo);
    }

    private getNotificationDetailsByAuthInfo(authInfo: AuthInfo): AtlasCodeNotification[] {
        Logger.debug(`Fetching notifications for ${authInfo.user.id}`);

        graphqlRequest(notificationFeedVSCode, { first: 10, productFilter: 'bitbucket' }, authInfo);
        return [];
    }

    private shouldRateLimit(authInfo: AuthInfo): boolean {
        if (Date.now() - this._lastNotificationSoftPull < AtlassianNotificationNotifier.NOTIFICATION_INTERVAL_MS) {
            Logger.debug('Not enough time has elapsed since last notification check');
            return true;
        }
        return false;
    }

    private isNotificationDetailRefreshNeeded(authInfo: AuthInfo): boolean {
        return this.isFirstDetailPull() || this.isLongTimeSinceLastDetailPull();
    }

    private isFirstDetailPull(): boolean {
        return this._lastDetailPull === 0;
    }

    private isLongTimeSinceLastDetailPull(): boolean {
        return Date.now() - this._lastDetailPull >= AtlassianNotificationNotifier.FORCE_DETAILS_UPDATE_INTERVAL_MS;
    }

    private async hasChangedUnseenNotifications(authInfo: AuthInfo): Promise<boolean> {
        const currentUnseenCount = await this.getUnseenNotifications(authInfo);
        if (currentUnseenCount === -1) {
            return false;
        }

        if (currentUnseenCount !== this._lastUnseenNotificationCount) {
            Logger.debug(
                `Unseen notification count changed from ${this._lastUnseenNotificationCount} to ${currentUnseenCount}`,
            );
            this._lastUnseenNotificationCount = currentUnseenCount;
            return true;
        }

        return false;
    }

    private getUnseenNotifications(authInfo: AuthInfo): Promise<number> {
        this._lastNotificationSoftPull = Date.now();
        return graphqlRequest(unseenNotificationCountVSCode, {}, authInfo)
            .then((response) => {
                if (response?.notifications?.unseenNotificationCount === undefined) {
                    Logger.warn('unseenNotificationCount is undefined in the response');
                    return -1;
                }
                return response.notifications.unseenNotificationCount;
            })
            .catch((error) => {
                Logger.error(new Error(`Error fetching unseen notification count: ${error}`));
                return -1;
            });
    }
}
