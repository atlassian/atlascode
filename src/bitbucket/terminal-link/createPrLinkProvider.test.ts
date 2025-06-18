const mockLink = {
    startIndex: 0,
    length: 0,
    tooltip: 'Create pull request',
    url: 'https://bitbucket.org/workspace/repo/pull-requests/new?source=branch',
};

jest.mock('../../container', () => ({
    Container: {
        config: {
            bitbucket: {
                showTerminalLinkPanel: true,
            },
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
            sendUIEvent: jest.fn(),
        },
        context: {
            subscriptions: [],
        },
        siteManager: {
            productHasAtLeastOneSite: jest.fn().mockReturnValue(true),
        },
    },
}));

jest.mock('../../analytics', () => ({
    createPrTerminalLinkDetectedEvent: jest.fn().mockResolvedValue({}),
    createPrTerminalLinkPanelButtonClickedEvent: jest.fn().mockResolvedValue({}),
    notificationChangeEvent: jest.fn().mockResolvedValue({}),
}));

import { commands, env, TerminalLinkContext, Uri, window } from 'vscode';

import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { BitbucketCloudPullRequestLinkProvider } from './createPrLinkProvider';

beforeEach(() => {
    env.openExternal = jest.fn().mockResolvedValue(true);
    Container.config.bitbucket.showTerminalLinkPanel = true;
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('BitbucketPullRequestLinkProvider', () => {
    describe('provideTerminalLinks', () => {
        it('should return empty array if no bb link is found', async () => {
            const provider = new BitbucketCloudPullRequestLinkProvider();
            const context: TerminalLinkContext = {
                line: 'This is a test line without a link',
                terminal: {} as any,
            };
            const result = await provider.provideTerminalLinks(context, {} as any);

            expect(result).toEqual([]);
        });

        it('should return empty array if link is not a create pull request link', async () => {
            const provider = new BitbucketCloudPullRequestLinkProvider();
            const context: TerminalLinkContext = {
                line: 'https://bitbucket.org/workspace/repo/pull-requests/1',
                terminal: {} as any,
            };
            const result = await provider.provideTerminalLinks(context, {} as any);

            expect(result).toEqual([]);
        });

        it('should return a link if a create pull request link is found', async () => {
            const provider = new BitbucketCloudPullRequestLinkProvider();
            const context: TerminalLinkContext = {
                line: 'https://bitbucket.org/workspace/repo/pull-requests/new?source=branch',
                terminal: {} as any,
            };
            const result = await provider.provideTerminalLinks(context, {} as any);

            expect(result).toHaveLength(1);
            expect(result?.[0].url).toBe('https://bitbucket.org/workspace/repo/pull-requests/new?source=branch');
        });
    });

    describe('handleTerminalLink', () => {
        it('should not display a message if disabled in config', async () => {
            Container.config.bitbucket.showTerminalLinkPanel = false;
            jest.spyOn(window, 'showInformationMessage');
            const provider = new BitbucketCloudPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should display a message if enabled in config', async () => {
            jest.spyOn(window, 'showInformationMessage');

            const provider = new BitbucketCloudPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(window.showInformationMessage).toHaveBeenCalledWith(
                'Do you want to create a pull request using the Jira and Bitbucket extension?',
                'Yes',
                'No, continue to Bitbucket',
                "Don't show again",
            );
        });

        it('should open create pull request view if user selects "Yes"', async () => {
            jest.spyOn(window, 'showInformationMessage');
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');

            (window.showInformationMessage as jest.Mock).mockResolvedValue('Yes');

            const provider = new BitbucketCloudPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(executeCommandSpy).toHaveBeenCalledWith('atlascode.bb.createPullRequest');
        });

        it('should open bitbucket authentication if user selects "Yes" and no site is available', async () => {
            jest.spyOn(window, 'showInformationMessage');
            jest.spyOn(Container.siteManager, 'productHasAtLeastOneSite').mockReturnValue(false);
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');

            (window.showInformationMessage as jest.Mock).mockResolvedValue('Yes');

            const provider = new BitbucketCloudPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(executeCommandSpy).toHaveBeenCalledWith('atlascode.showBitbucketAuth');
        });

        it('should open the URL if user selects "No, continue to Bitbucket"', async () => {
            const mockUri = Uri.parse(mockLink.url);
            Container.config.bitbucket.showTerminalLinkPanel = true;
            const provider = new BitbucketCloudPullRequestLinkProvider();
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');

            (window.showInformationMessage as jest.Mock).mockResolvedValue('No, continue to Bitbucket');

            await provider.handleTerminalLink(mockLink);

            expect(executeCommandSpy).not.toHaveBeenCalledWith('atlascode.bb.createPullRequest');
            expect(env.openExternal).toHaveBeenCalledWith(mockUri);
        });

        it('should open the URL and disable the terminal link if user selects "Don\'t show again"', async () => {
            const mockUri = Uri.parse(mockLink.url);
            Container.config.bitbucket.showTerminalLinkPanel = true;
            const provider = new BitbucketCloudPullRequestLinkProvider();
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');
            const configSpy = jest.spyOn(configuration, 'updateEffective');

            (window.showInformationMessage as jest.Mock).mockResolvedValue("Don't show again");

            await provider.handleTerminalLink(mockLink);

            expect(executeCommandSpy).not.toHaveBeenCalledWith('atlascode.bb.createPullRequest');
            expect(env.openExternal).toHaveBeenCalledWith(mockUri);
            expect(configSpy).toHaveBeenCalledWith('bitbucket.showTerminalLinkPanel', false, null, true);
        });
    });
});
