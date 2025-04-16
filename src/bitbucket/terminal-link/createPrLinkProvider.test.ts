const mockLink = {
    startIndex: 0,
    length: 0,
    tooltip: 'Create pull request',
    url: 'https://bitbucket.org/workspace/repo/pull-requests/new?source=branch',
};

jest.mock('../../commands', () => ({
    Commands: {
        CreatePullRequest: 'bitbucket.createPullRequest',
    },
}));

jest.mock('../../container', () => ({
    Container: {
        config: {
            bitbucket: {
                showTerminalLinkPanel: true,
            },
        },
    },
}));

import { commands, env, TerminalLinkContext, Uri, window } from 'vscode';

import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { BitbucketPullRequestLinkProvider } from './createPrLinkProvider';

beforeEach(() => {
    env.openExternal = jest.fn().mockResolvedValue(true);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('BitbucketPullRequestLinkProvider', () => {
    describe('provideTerminalLinks', () => {
        it('should return empty array if no bb link is found', async () => {
            const provider = new BitbucketPullRequestLinkProvider();
            const context: TerminalLinkContext = {
                line: 'This is a test line without a link',
                terminal: {} as any,
            };
            const result = await provider.provideTerminalLinks(context, {} as any);

            expect(result).toEqual([]);
        });

        it('should return empty array if link is not a create pull request link', async () => {
            const provider = new BitbucketPullRequestLinkProvider();
            const context: TerminalLinkContext = {
                line: 'https://bitbucket.org/workspace/repo/pull-requests/1',
                terminal: {} as any,
            };
            const result = await provider.provideTerminalLinks(context, {} as any);

            expect(result).toEqual([]);
        });

        it('should return a link if a create pull request link is found', async () => {
            const provider = new BitbucketPullRequestLinkProvider();
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
            const provider = new BitbucketPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should display a message if enabled in config', async () => {
            Container.config.bitbucket.showTerminalLinkPanel = true;
            jest.spyOn(window, 'showInformationMessage');
            const provider = new BitbucketPullRequestLinkProvider();

            await provider.handleTerminalLink(mockLink);

            expect(window.showInformationMessage).toHaveBeenCalledWith(
                'Do you want to create a pull request using the Jira and Bitbucket extension?',
                'Yes',
                'No, continue to Bitbucket',
                "Don't show again",
            );
        });

        it('should open create pull request view if user selects "Yes"', async () => {
            Container.config.bitbucket.showTerminalLinkPanel = true;
            const provider = new BitbucketPullRequestLinkProvider();
            jest.spyOn(window, 'showInformationMessage');
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');

            (window.showInformationMessage as jest.Mock).mockResolvedValue('Yes');

            await provider.handleTerminalLink(mockLink);
            expect(executeCommandSpy).toHaveBeenCalledWith('bitbucket.createPullRequest');
        });

        it('should open the URL if user selects "No, continue to Bitbucket"', async () => {
            const mockUri = Uri.parse(mockLink.url);
            Container.config.bitbucket.showTerminalLinkPanel = true;
            const provider = new BitbucketPullRequestLinkProvider();
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');

            (window.showInformationMessage as jest.Mock).mockResolvedValue('No, continue to Bitbucket');

            await provider.handleTerminalLink(mockLink);
            expect(executeCommandSpy).not.toHaveBeenCalledWith('bitbucket.createPullRequest');
            expect(env.openExternal).toHaveBeenCalledWith(mockUri);
        });

        it('should open the URL and disable the terminal link if user selects "Don\'t show again"', async () => {
            const mockUri = Uri.parse(mockLink.url);
            Container.config.bitbucket.showTerminalLinkPanel = true;
            const provider = new BitbucketPullRequestLinkProvider();
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');
            const configSpy = jest.spyOn(configuration, 'update');

            (window.showInformationMessage as jest.Mock).mockResolvedValue("Don't show again");

            await provider.handleTerminalLink(mockLink);
            expect(executeCommandSpy).not.toHaveBeenCalledWith('bitbucket.createPullRequest');
            expect(env.openExternal).toHaveBeenCalledWith(mockUri);
            expect(configSpy).toHaveBeenCalledWith('bitbucket.showTerminalLinkPanel', false, 1);
        });
    });
});
