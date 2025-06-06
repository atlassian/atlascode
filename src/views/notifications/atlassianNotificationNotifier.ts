import { Disposable, Uri } from 'vscode';

import { AuthInfo, AuthInfoEvent, isRemoveAuthEvent, ProductBitbucket, ProductJira } from '../../atlclients/authInfo';
import { graphqlRequest } from '../../atlclients/graphql/graphqlClient';
import { notificationFeedVSCode, unseenNotificationCountVSCode } from '../../atlclients/graphql/graphqlDocuments';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { Time } from '../../util/time';
import {
    AtlasCodeNotification,
    NotificationManagerImpl,
    NotificationNotifier,
    NotificationType,
} from './notificationManager';

export const allowedBitbucketHosts = ['bitbucket.org'];

export class AtlassianNotificationNotifier extends Disposable implements NotificationNotifier {
    private static instance: AtlassianNotificationNotifier;

    private _lastUnseenNotificationCount: Record<string, number> = {};
    private _lastPull: Record<string, number> = {};
    private static readonly NOTIFICATION_INTERVAL_MS = 60 * 1000; // 1 minute
    private _lastFullPull: Record<string, number> = {};
    private static readonly NOTIFICATION_FULL_PULL_INTERVAL_MS = 20 * this.NOTIFICATION_INTERVAL_MS;
    private _disposable: Disposable[] = [];

    public static getInstance(): AtlassianNotificationNotifier {
        if (!AtlassianNotificationNotifier.instance) {
            AtlassianNotificationNotifier.instance = new AtlassianNotificationNotifier();
        }
        return AtlassianNotificationNotifier.instance;
    }
    private constructor() {
        super(() => {
            this.dispose();
        });
        this._disposable.push(Disposable.from(Container.credentialManager.onDidAuthChange(this.onDidAuthChange, this)));
    }

    public dispose() {
        this._disposable.forEach((e) => e.dispose());
    }

    public fetchNotifications(): void {
        Container.credentialManager.getAllValidAuthInfo(ProductJira).then((authInfos: AuthInfo[]) => {
            authInfos.forEach(async (authInfo: AuthInfo) => {
                await this.getLatestNotifications(authInfo);
            });
        });
    }

    private async getLatestNotifications(authInfo: AuthInfo): Promise<void> {
        if (this.shouldRateLimit(authInfo)) {
            return;
        }
        this._lastPull[authInfo.user.id] = Date.now();

        const numUnseenNotifications = await this.getNumberOfUnseenNotifications(authInfo);
        if (numUnseenNotifications === this._lastUnseenNotificationCount[authInfo.user.id]) {
            // if we haven't checked in a while, we still want to fetch the notifications
            if (this.shouldFetchFullNotifications(authInfo)) {
                Logger.debug(
                    `No changes in unseen notifications for ${authInfo.user.id}, but pulling full feed as it has been a while`,
                );
            } else {
                Logger.debug(`No changes in unseen notifications for ${authInfo.user.id}`);
                return;
            }
        }
        this._lastUnseenNotificationCount[authInfo.user.id] = numUnseenNotifications;

        Logger.debug(`Found ${numUnseenNotifications} unseen notifications for ${authInfo.user.id}`);
        this.getNotificationDetailsByAuthInfo(authInfo, numUnseenNotifications);
    }

    private shouldFetchFullNotifications(authInfo: AuthInfo) {
        const lastFullPull = this._lastFullPull[authInfo.user.id] || 0;
        return Date.now() - lastFullPull > AtlassianNotificationNotifier.NOTIFICATION_FULL_PULL_INTERVAL_MS;
    }

    private getNotificationDetailsByAuthInfo(authInfo: AuthInfo, numberToFetch: number): void {
        if (numberToFetch <= 0) {
            Logger.debug(`No unseen notifications to fetch for ${authInfo.user.id}`);
            return;
        }
        this._lastFullPull[authInfo.user.id] = Date.now();
        Logger.debug(`Fetching notifications for ${authInfo.user.id}`);
        graphqlRequest(notificationFeedVSCode, { first: numberToFetch }, authInfo)
            .then((response) => {
                if (!response?.notifications?.notificationFeed?.nodes) {
                    Logger.warn('notificationFeed is undefined in the response');
                    return;
                }
                response.notifications.notificationFeed.nodes
                    .filter((node: any) => this.filter(node))
                    .map((node: any) => {
                        const notification = this.mapper(authInfo, node);
                        if (notification) {
                            NotificationManagerImpl.getInstance().addNotification(notification);
                        }
                    });
            })
            .catch((error) => {
                Logger.error(error, 'Error fetching notifications');
            });
    }

    private mapper(authInfo: AuthInfo, node: any): AtlasCodeNotification | undefined {
        const product = this.isJiraNotification(node)
            ? ProductJira
            : this.isBitbucketNotification(node)
              ? ProductBitbucket
              : undefined;
        if (!product) {
            Logger.warn(`Unsupported notification type for URL: ${node.headNotification.content.url}`);
            return undefined;
        }
        const notificationType = product === ProductJira ? NotificationType.JiraComment : NotificationType.PRComment;

        // Strip query parameters from the URL before creating the Uri
        const url = node.headNotification.content.url.split('?')[0];

        return {
            id: node.headNotification.notificationId,
            uri: Uri.parse(url),
            message: this.makeMessage(node),
            notificationType: notificationType,
            product: product,
            userId: authInfo.user.id,
            timestamp: new Date(node.headNotification.timestamp).valueOf(),
        };
    }

    private makeMessage(node: any): string {
        const bodyMessage = this.processBodyItems(node);
        let message = node.headNotification.content.message + (bodyMessage ? `: ${bodyMessage}` : '');
        // if message is too long, truncate it and add ellipsis
        if (message.length > 200) {
            message = message.substring(0, 200 - 3) + '...';
        }
        return message;
    }

    private processBodyItems(node: any): string {
        const bodyItems = node.headNotification.content.bodyItems;
        if (!bodyItems || bodyItems.length === 0) {
            return '';
        }

        const bodyItem = bodyItems[0];
        if (!bodyItem.document || bodyItem.document.format !== 'ADF') {
            return '';
        }

        let adfData: any;
        try {
            adfData = JSON.parse(bodyItem.document.data);
        } catch (error) {
            Logger.error(error, 'Error parsing ADF data');
            return '';
        }

        return this.extractTextFromAdf(adfData).trim();
    }

    private extractTextFromAdf(adfData: any): string {
        if (!adfData?.content || !Array.isArray(adfData.content)) {
            return '';
        }
        return adfData.content.map((item: any) => this.extractTextFromAdfItem(item)).join(' ');
    }

    private extractTextFromAdfItem(item: any): string {
        if (!item?.content || !Array.isArray(item.content)) {
            return '';
        }
        return item.content
            .map((contentItem: any) => {
                if (contentItem.type === 'text') {
                    return contentItem.text || '';
                }
                if (contentItem.attrs && contentItem.attrs.text) {
                    return contentItem.attrs.text;
                }
                return '';
            })
            .join(' ');
    }

    private isJiraNotification(node: any): boolean {
        return node.headNotification.content.url.includes('atlassian.net/browse/');
    }

    private isBitbucketNotification(node: any): boolean {
        try {
            const parsedUrl = new URL(node.headNotification.content.url);

            return allowedBitbucketHosts.includes(parsedUrl.host);
        } catch (error) {
            Logger.error(error, 'Error parsing URL');
            return false;
        }
    }

    private isCommentNotification(node: any): boolean {
        return node.headNotification.content.message.toLowerCase().includes('comment');
    }

    private filter(node: any): boolean {
        // Check that notification is within the past week
        const notificationDate = new Date(node.headNotification.timestamp);
        const oneWeekAgo = new Date(Date.now() - 7 * Time.DAYS);
        if (notificationDate < oneWeekAgo) {
            Logger.debug('Notification is older than one week, skipping');
            return false;
        }

        const isComment = this.isCommentNotification(node);
        const isJira = this.isJiraNotification(node);
        const isBitbucket = this.isBitbucketNotification(node);

        return isComment && (isJira || isBitbucket);
    }

    private shouldRateLimit(authInfo: AuthInfo): boolean {
        // Use per-user last pull
        const lastPull = this._lastPull[authInfo.user.id] || 0;
        if (Date.now() - lastPull < AtlassianNotificationNotifier.NOTIFICATION_INTERVAL_MS) {
            Logger.debug('Not enough time has elapsed since last notification check');
            return true;
        }
        return false;
    }

    private getNumberOfUnseenNotifications(authInfo: AuthInfo): Promise<number> {
        return graphqlRequest(unseenNotificationCountVSCode, {}, authInfo)
            .then((response) => {
                if (response?.notifications?.unseenNotificationCount === undefined) {
                    Logger.warn('unseenNotificationCount is undefined in the response');
                    return 0;
                }
                return response.notifications.unseenNotificationCount;
            })
            .catch((error) => {
                Logger.error(error, 'Error fetching unseen notification count');
                return 0;
            });
    }

    private onDidAuthChange(e: AuthInfoEvent): void {
        if (isRemoveAuthEvent(e)) {
            this._lastUnseenNotificationCount[e.userId] = 0;
            return;
        }
    }
}
