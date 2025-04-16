import {
    CancellationToken,
    commands,
    ConfigurationTarget,
    Disposable,
    env,
    ProviderResult,
    TerminalLink,
    TerminalLinkContext,
    TerminalLinkProvider,
    Uri,
    window,
} from 'vscode';

import { createPrTerminalLinkDetectedEvent, createPrTerminalLinkPanelButtonClickedEvent } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min.js';
import { CreatePrTerminalSelection } from '../../analyticsTypes';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';

interface BitbucketTerminalLink extends TerminalLink {
    url: string;
}
const PanelId = 'atlascode.bitbucket.createPullRequestTerminalLinkPanel';

const BBCloudPullRequestLinkRegex = new RegExp(/https:\/\/bitbucket\.org\/(.*)\/(.*)\/pull-requests\/new\?source=(.*)/);

export class BitbucketCloudPullRequestLinkProvider extends Disposable implements TerminalLinkProvider {
    private _analyticsClient: AnalyticsClient;

    constructor() {
        super(() => this.dispose());
        this._analyticsClient = Container.analyticsClient;
        window.registerTerminalLinkProvider(this);
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
        if (result) {
            const link: BitbucketTerminalLink = {
                startIndex,
                length: context.line.length - startIndex,
                tooltip: `Create pull request`,
                url,
            };

            return [link];
        }
        return [];
    }

    handleTerminalLink(link: BitbucketTerminalLink): ProviderResult<void> {
        const enabled = Container.config.bitbucket.showTerminalLinkPanel;

        createPrTerminalLinkDetectedEvent(enabled).then((event) => {
            this._analyticsClient.sendTrackEvent(event);
        });

        if (!enabled) {
            this.openUrl(link.url);
            return;
        }
        const yes = 'Yes';
        const neverShow = "Don't show again";

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
                        commands.executeCommand(Commands.CreatePullRequest);
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

                createPrTerminalLinkPanelButtonClickedEvent(PanelId, type).then((event) => {
                    this._analyticsClient.sendUIEvent(event);
                });
            });
    }

    private openUrl(url: string) {
        return env.openExternal(Uri.parse(url));
    }

    private disable = () =>
        configuration.update('bitbucket.showTerminalLinkPanel', false, ConfigurationTarget.Workspace);
}
