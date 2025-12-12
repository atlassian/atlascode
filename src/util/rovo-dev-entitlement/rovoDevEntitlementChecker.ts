import { notificationBannerClickedEvent, notificationChangeEvent, rovoDevEntitlementCheckEvent } from 'src/analytics';
import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { ValidBasicAuthSiteData } from 'src/atlclients/clientManager';
import { configuration } from 'src/config/configuration';
import { Container } from 'src/container';
import { Logger } from 'src/logger';
import { RovodevCommands } from 'src/rovo-dev/api/componentApi';
import { NotificationSurface } from 'src/views/notifications/notificationManager';
import { NotificationSource } from 'src/views/notifications/notificationSources';
import { commands, ConfigurationChangeEvent, Disposable, env, Uri, window } from 'vscode';

import { Features } from '../features';
import { RovoDevEntitlementError, RovoDevEntitlementErrorType } from './rovoDevEntitlementError';

export enum RovoDevEntitlementType {
    ROVO_DEV_EVERYWHERE = 'ROVO_DEV_EVERYWHERE',
    ROVO_DEV_STANDARD = 'ROVO_DEV_STANDARD',
    ROVO_DEV_STANDARD_TRIAL = 'ROVO_DEV_STANDARD_TRIAL',
    ROVO_DEV_BETA = 'ROVO_DEV_BETA',
    UNKNOWN = 'UNKNOWN',
}
interface EntitlementResponse {
    isEntitled: boolean;
    type: RovoDevEntitlementType | RovoDevEntitlementErrorType;
}

const ENTITLED_MESSAGE = `Work with Atlassian Rovo Dev in VS Code. It's AI for software teams, bringing your team's knowledge from Jira and Confluence to help you ship better code, faster.`;

export class RovoDevEntitlementChecker extends Disposable {
    private readonly _endpoint = `/gateway/api/rovodev/v3/sites/type`;
    private readonly _infoUri = Uri.parse('https://support.atlassian.com/rovo/docs/work-with-rovo-dev-in-the-ide/');
    private _analyticsClient: AnalyticsClient;

    private _enabled: boolean;

    private _cachedEntitlement: EntitlementResponse | null;

    private disposable: Disposable;

    constructor(analyticsClient: AnalyticsClient) {
        super(() => this._dispose());
        this._analyticsClient = analyticsClient;
        this._enabled = Container.config.rovodev.showEntitlementNotifications;
        this._cachedEntitlement = null;
        this.disposable = Disposable.from(
            configuration.onDidChange(this.onDidChangeConfiguration, this),
            Container.siteManager.onDidSitesAvailableChange(() => {
                this._cachedEntitlement = null;
            }, this),
        );
    }

    private onDidChangeConfiguration(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'rovodev.showEntitlementNotifications')) {
            this._enabled = Container.config.rovodev.showEntitlementNotifications;
        }
    }

    public async checkEntitlement(): Promise<EntitlementResponse> {
        try {
            if (this._cachedEntitlement) {
                Logger.debug(`Cached entitlement response: ${this._cachedEntitlement.type}`);
                return this._cachedEntitlement;
            }

            const credentials = await Container.clientManager.getCloudPrimarySite();

            if (!credentials || !credentials.isValid) {
                // Check entitlement for OAuth
                const fgEntitlement = Container.featureFlagClient.checkGate(Features.RovoDevSiteEntitled);
                if (!fgEntitlement) {
                    throw new RovoDevEntitlementError(
                        RovoDevEntitlementErrorType.NO_ACTIVE_PRODUCT,
                        'No active Rovo Dev product found',
                    );
                }
                const type = RovoDevEntitlementType.UNKNOWN;
                rovoDevEntitlementCheckEvent(true, type).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
                this._cachedEntitlement = {
                    isEntitled: true,
                    type: type,
                };
                return this._cachedEntitlement;
            }

            const options = {
                method: 'GET',
                headers: { ...this.createHeaders(credentials) },
            };

            const response = await fetch(`https://${credentials.host}${this._endpoint}`, options).catch((err) => {
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.FETCH_FAILED,
                    `Failed to fetch Rovo Dev entitlement: ${err.message}`,
                );
            });

            if (!response.ok) {
                const message = response.toString();
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.FETCH_FAILED,
                    `Failed to fetch Rovo Dev entitlement: ${message}`,
                    response.status,
                );
            }

            const value = await response.text();
            Logger.debug(`Entitlement response: ${value}`);

            if (!(value.trim() in RovoDevEntitlementType)) {
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.NO_ACTIVE_PRODUCT,
                    'No active Rovo Dev product found for the provided credentials',
                );
            }

            rovoDevEntitlementCheckEvent(true, value).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });

            this._cachedEntitlement = {
                isEntitled: true,
                type: value.trim() as RovoDevEntitlementType,
            };
            return this._cachedEntitlement;
        } catch (err) {
            Logger.error(err, 'Unable to check Rovo Dev entitlement');
            const errType: string =
                err instanceof RovoDevEntitlementError ? err.errorType : RovoDevEntitlementErrorType.UNKNOWN_ERROR;
            let errTypeFinal = errType;
            if (errType === RovoDevEntitlementErrorType.FETCH_FAILED && err.statusCode) {
                errTypeFinal = `${errType}_${err.statusCode}`;
            }

            rovoDevEntitlementCheckEvent(false, errTypeFinal).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });

            return {
                isEntitled: false,
                type: errType as RovoDevEntitlementErrorType,
            };
        }
    }

    public async triggerEntitlementNotification(): Promise<void> {
        const showNotification = Container.featureFlagClient.checkGate(Features.RovoDevEntitlementNotification);
        if (!Container.config.jira.enabled || Container.isBoysenberryMode) {
            return;
        }

        const { isEntitled, type } = await this.checkEntitlement();

        if (!this._enabled || !Container.config.rovodev.enabled || !showNotification) {
            return;
        }

        if (!isEntitled) {
            return;
        }

        if (!(type in RovoDevEntitlementType)) {
            return;
        }

        notificationChangeEvent(
            NotificationSource.RovoDevEntitlementCheckEntitled,
            undefined,
            NotificationSurface.Banner,
            1,
        ).then((event) => {
            this._analyticsClient.sendTrackEvent(event);
        });

        const dontShowAgain = "Don't show again";

        window
            .showInformationMessage(ENTITLED_MESSAGE, 'Try Rovo Dev', 'Read documentation', dontShowAgain)
            .then((selection) => {
                let buttonType = 'dismiss';
                if (selection === 'Try Rovo Dev') {
                    buttonType = 'openRovoDev';
                    commands.executeCommand(RovodevCommands.FocusRovoDevWindow).then(() => {
                        this._disable();
                    });
                } else if (selection === 'Read documentation') {
                    buttonType = 'openInfoLink';
                    this.openInfoLink();
                } else if (selection === dontShowAgain) {
                    buttonType = 'dontShowAgain';
                    this._disable();
                }

                notificationBannerClickedEvent(NotificationSource.RovoDevEntitlementCheckEntitled, buttonType).then(
                    (event) => {
                        this._analyticsClient.sendUIEvent(event);
                    },
                );
            });
        return;
    }

    private createHeaders(cred: ValidBasicAuthSiteData): Record<string, string> {
        const headers: Record<string, string> = {};

        const authInfo = cred.authInfo;
        const encodedAuth = Buffer.from(`${authInfo.username}:${authInfo.password}`).toString('base64');

        headers['Authorization'] = `Basic ${encodedAuth}`;

        headers['X-RovoDev-Billing-CloudId'] = cred.siteCloudId;

        return headers;
    }

    private openInfoLink() {
        env.openExternal(this._infoUri);
    }

    private _disable() {
        configuration.updateEffective('rovodev.showEntitlementNotifications', false, null, true);
    }

    private _dispose() {
        this.disposable.dispose();
    }
}
