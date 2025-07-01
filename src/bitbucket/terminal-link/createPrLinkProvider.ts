import { NotificationSource } from 'src/views/notifications/notificationSources';
import {
    CancellationToken,
    commands,
    ConfigurationChangeEvent,
    Disposable,
    env,
    ProviderResult,
    TerminalLink,
    TerminalLinkContext,
    TerminalLinkProvider,
    Uri,
    window,
} from 'vscode';

import {
    createPrTerminalLinkDetectedEvent,
    createPrTerminalLinkPanelButtonClickedEvent,
    notificationChangeEvent,
} from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min.js';
import { CreatePrTerminalSelection } from '../../analyticsTypes';
import { ProductBitbucket } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { NotificationSurface } from '../../views/notifications/notificationManager';

interface BitbucketTerminalLink extends TerminalLink {
    url: string;
}
const PanelId = 'atlascode.bitbucket.createPullRequestTerminalLinkPanel';

const BBCloudPullRequestLinkRegex = new RegExp(/https:\/\/bitbucket\.org\/(.*)\/(.*)\/pull-requests\/new\?source=(.*)/);

export class BitbucketCloudPullRequestLinkProvider extends Disposable implements TerminalLinkProvider {
    private _analyticsClient: AnalyticsClient;

    private _isNotificationEnabled: boolean;

    constructor() {
        super(() => this.dispose());
        this._analyticsClient = Container.analyticsClient;
        this._isNotificationEnabled = Container.config.bitbucket.showTerminalLinkPanel;

        Container.context.subscriptions.push(configuration.onDidChange(this.onDidChangeConfiguration, this));
        window.registerTerminalLinkProvider(this);
    }

    onDidChangeConfiguration(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'bitbucket.showTerminalLinkPanel')) {
            this._isNotificationEnabled = Container.config.bitbucket.showTerminalLinkPanel;
        }
    }

    provideTerminalLinks(
        context: TerminalLinkContext,
        token: CancellationToken,
    ): ProviderResult<BitbucketTerminalLink[]> {
        const startIndex = context.line.indexOf('https://bitbucket.org/');
        if (startIndex === -1) {
            return [];
        }

        const url = context.line.substring(startIndex);

        const result = url.match(BBCloudPullRequestLinkRegex);

        // check if url is proper create pull request url
        // https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>
        if (!result) {
            return [];
        }

        if (this._isNotificationEnabled) {
            const link: BitbucketTerminalLink = {
                startIndex,
                length: context.line.length - startIndex,
                tooltip: `Create pull request`,
                url,
            };

            createPrTerminalLinkDetectedEvent(true).then((event) => {
                this._analyticsClient.sendTrackEvent(event);
            });

            return [link];
        } else {
            createPrTerminalLinkDetectedEvent(false).then((event) => {
                this._analyticsClient.sendTrackEvent(event);
            });

            return [];
        }
    }

    handleTerminalLink(link: BitbucketTerminalLink): ProviderResult<void> {
        if (!this._isNotificationEnabled) {
            this.openUrl(link.url);
            return;
        }
        const yes = 'Yes';
        const neverShow = "Don't show again";

        notificationChangeEvent(NotificationSource.BitbucketTerminalUri, undefined, NotificationSurface.Banner, 1).then(
            (event) => {
                this._analyticsClient.sendTrackEvent(event);
            },
        );

        window
            .showInformationMessage(
                'Do you want to create a pull request using the Jira and Bitbucket extension?',
                yes,
                'No, continue to Bitbucket',
                neverShow,
            )
            .then((selection) => {
                let type = CreatePrTerminalSelection.Ignore;
                switch (selection) {
                    case yes:
                        type = CreatePrTerminalSelection.Yes;
                        this.openCreatePr();
                        break;
                    case neverShow:
                        type = CreatePrTerminalSelection.Disable;
                        this.disable();
                        this.openUrl(link.url);
                        break;
                    default:
                        this.openUrl(link.url);
                        break;
                }

                // send event for button clicked
                createPrTerminalLinkPanelButtonClickedEvent(PanelId, type).then((event) => {
                    this._analyticsClient.sendUIEvent(event);
                });
            });
    }

    private openCreatePr() {
        if (!Container.siteManager.productHasAtLeastOneSite(ProductBitbucket)) {
            commands.executeCommand(Commands.ShowBitbucketAuth);
        } else {
            commands.executeCommand(Commands.CreatePullRequest);
        }
    }

    private openUrl(url: string) {
        return env.openExternal(Uri.parse(url));
    }

    private disable() {
        configuration.updateEffective('bitbucket.showTerminalLinkPanel', false, null, true);
    }
}
