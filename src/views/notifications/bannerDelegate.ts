import { commands, Uri, window } from 'vscode';

import { notificationActionButtonClickedEvent, notificationChangeEvent } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { extractPullRequestComponents } from '../../commands/bitbucket/pullRequest';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { parseJiraIssueKeys } from '../../jira/issueKeyParser';
import {
    AtlasCodeNotification,
    NotificationAction,
    NotificationChangeEvent,
    NotificationDelegate,
    NotificationManagerImpl,
    NotificationSurface,
    NotificationType,
} from './notificationManager';
import { determineNotificationSource } from './notificationSources';

export class BannerDelegate implements NotificationDelegate {
    private static bannerDelegateSingleton: BannerDelegate | undefined = undefined;
    private _analyticsClient: AnalyticsClient;
    private pile: Set<NotificationChangeEvent> = new Set();
    private timer: NodeJS.Timeout | undefined;

    public static getInstance(): BannerDelegate {
        if (!this.bannerDelegateSingleton) {
            this.bannerDelegateSingleton = new BannerDelegate();
            NotificationManagerImpl.getInstance().registerDelegate(this.bannerDelegateSingleton);
        }
        return this.bannerDelegateSingleton!;
    }

    private constructor() {
        this._analyticsClient = Container.analyticsClient;
    }

    public getSurface(): NotificationSurface {
        return NotificationSurface.Banner;
    }

    public onNotificationChange(event: NotificationChangeEvent): void {
        switch (event.action) {
            case NotificationAction.Removed:
            case NotificationAction.MarkedAsRead:
                return;
            default:
                break;
        }

        // Adds to the "pile of notifications" for the given URI.
        this.pile.add(event);

        this.scheduleNotificationDisplay();
    }

    private scheduleNotificationDisplay() {
        this.clearExistingSchedule();
        this.createNewSchedule();
    }

    private createNewSchedule() {
        this.timer = setTimeout(() => {
            this.aggregateAndShowNotifications();
        }, 500);
    }

    private clearExistingSchedule() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private aggregateAndShowNotifications() {
        // for now, this simply shows all notifications in the pile with no aggregation. In the future, this should group notifications by notification type.
        this.pile.forEach((event) => {
            if (event.action === NotificationAction.Added) {
                event.notifications.forEach((notification) => {
                    const { text, action } = this.makeAction(notification);
                    this.showNotification(notification, text, action);
                });
            }
        });
        this.pile.clear();
        this.timer = undefined;
    }

    private showNotification(notification: AtlasCodeNotification, yesText: string, yesAction: () => void) {
        const displayedNotification = window.showInformationMessage(notification.message, yesText);
        this.analyticsBannerShown(notification.uri, 1);

        displayedNotification.then((selection) => {
            switch (selection) {
                case yesText:
                    yesAction();
                    this.analyticsBannerAction(notification, yesText);
                    break;
                default:
                    break;
            }
        });
    }

    private makeAction(notification: AtlasCodeNotification): { text: string; action: () => void } {
        switch (notification.notificationType) {
            case NotificationType.JiraComment:
                const issueKey = this.getNotificationSourceKeyFromUri(notification.uri, notification.notificationType);

                return {
                    text: `View ${issueKey || 'Jira Issue'}`,
                    action: () => {
                        commands.executeCommand(Commands.ShowIssueForURL, notification.uri.toString());
                    },
                };
            case NotificationType.PRComment:
                const prKey = this.getNotificationSourceKeyFromUri(notification.uri, notification.notificationType);

                return {
                    text: `View ${prKey || 'Pull Request'}`,
                    action: () => {
                        commands.executeCommand(Commands.BitbucketOpenPullRequest, {
                            pullRequestUrl: notification.uri.toString(),
                        });
                    },
                };
            case NotificationType.AssignedToYou:
                return {
                    text: 'View Assigned Work Item',
                    action: () => {},
                };
            case NotificationType.LoginNeeded:
                return {
                    text: 'Log in to Jira',
                    action: () => {
                        commands.executeCommand(Commands.ShowJiraAuth);
                    },
                };
            default:
                throw new Error(`Cannot make action: Unknown notification type: ${notification.notificationType}`);
        }
    }

    private analyticsBannerShown(uri: Uri, count: number) {
        notificationChangeEvent(determineNotificationSource(uri), uri, NotificationSurface.Banner, count).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    private analyticsBannerAction(notification: AtlasCodeNotification, action: string) {
        notificationActionButtonClickedEvent(
            notification.uri,
            {
                surface: NotificationSurface.Banner,
                type: notification.notificationType,
            },
            action,
        ).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    private getNotificationSourceKeyFromUri(uri: Uri, notificationType: NotificationType): string | undefined {
        if (notificationType === NotificationType.JiraComment) {
            const match = parseJiraIssueKeys(uri.path);
            const issueKey = match && match.length ? match[0] : undefined;

            return issueKey;
        }

        if (notificationType === NotificationType.PRComment) {
            const prId = extractPullRequestComponents(uri.toString()).prId;

            return `PR #${prId}`;
        }

        return undefined;
    }
}
