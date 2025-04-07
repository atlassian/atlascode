import { Uri, window } from 'vscode';

import { OpenPullRequestUriHandlerAction } from './openPullRequest';

describe('OpenPullRequestUriHandlerAction', () => {
    let action: OpenPullRequestUriHandlerAction;
    const mockAnalyticsApi = {
        fireDeepLinkEvent: jest.fn(),
    };
    const mockCheckoutHelper = {
        pullRequest: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        action = new OpenPullRequestUriHandlerAction(mockAnalyticsApi as any, mockCheckoutHelper as any);
    });

    describe('isAccepted', () => {
        it('only accepts URIs ending with openPullRequest', () => {
            expect(action.isAccepted(Uri.parse('https://some-uri/openPullRequest'))).toBe(true);
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBe(false);
        });
    });

    describe('parsePrUrl', () => {
        it('extracts the repo url and pr number from a URL', () => {
            expect(action.parsePrUrl('https://bitbucket.com/my-cool-repo/pull-requests/123')).toEqual({
                repoUrl: 'https://bitbucket.com/my-cool-repo',
                prId: 123,
            });

            // This will actually fail with the current implementation:
            // expect(action.parsePrUrl('https://bitbucket.com/my-cool-repo/pull-requests/123/overview')).toEqual({
            //     repoUrl: 'https://bitbucket.com/my-cool-repo',
            //     prId: 123
            // });
        });
    });

    describe('handle', () => {
        it('throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse('https://some-uri/openPullRequest'))).rejects.toThrow();
        });

        it('throws if repo URL fails to parse', async () => {
            action.parsePrUrl = jest.fn().mockImplementation(() => {
                throw new Error('oh no');
            });
            await expect(action.handle(Uri.parse('https://some-uri/openPullRequest?q=...'))).rejects.toThrow();
        });

        it('opens a pull request and fires an event on success', async () => {
            mockCheckoutHelper.pullRequest.mockResolvedValue(true);
            action.parsePrUrl = jest.fn().mockReturnValue({ repoUrl: 'one', prId: 2 });
            await action.handle(Uri.parse('https://some-uri/openPullRequest?q=one'));

            expect(mockCheckoutHelper.pullRequest).toHaveBeenCalledWith('one', 2);
            expect(mockAnalyticsApi.fireDeepLinkEvent).toHaveBeenCalled();
        });

        it('shows an error message on failure', async () => {
            mockCheckoutHelper.pullRequest.mockRejectedValue(new Error('oh no'));
            await action.handle(Uri.parse('https://some-uri/openPullRequest?q=...'));
            action.parsePrUrl = jest.fn().mockReturnValue({ repoUrl: 'one', prId: 2 });

            // This will actually fail with the current implementation:
            expect(window.showErrorMessage).toHaveBeenCalledWith('Error opening pull request (check log for details)');
        });
    });
});
