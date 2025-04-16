import { Commands } from 'src/commands';
import { configuration } from 'src/config/configuration';
import { Container } from 'src/container';
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

interface BitbucketTerminalLink extends TerminalLink {
    url: string;
}

export class BitbucketPullRequestLinkProvider extends Disposable implements TerminalLinkProvider {
    private readonly bbPullRequestLinkRegex = new RegExp(
        /https:\/\/bitbucket\.org\/(.*)\/(.*)\/pull-requests\/new\?source=(.*)&?.*/,
    );
    constructor() {
        super(() => this.dispose());

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

        const result = url.match(this.bbPullRequestLinkRegex);

        // check if url is proper create pull request url
        // https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>
        if (result && result.length === 4) {
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
                switch (selection) {
                    case yes:
                        commands.executeCommand(Commands.CreatePullRequest);
                        break;
                    case neverShow:
                        this.disable();
                        this.openUrl(link.url);
                        break;
                    default:
                        this.openUrl(link.url);
                        break;
                }
            });
    }

    private openUrl(url: string) {
        return env.openExternal(Uri.parse(url));
    }

    private disable = () => configuration.update('bitbucket.showTerminalLinkPanel', false, ConfigurationTarget.Global);
}
