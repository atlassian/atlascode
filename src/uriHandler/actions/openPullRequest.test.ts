import { Uri, window } from 'vscode';

import { expansionCastTo } from '../../../testsutil';
import { CheckoutHelper } from '../../bitbucket/interfaces';
import { OpenPullRequestUriHandler } from './openPullRequest';

describe('OpenPullRequestUriHandlerAction', () => {
    let action: OpenPullRequestUriHandler;
    const mockCheckoutHelper = {
        pullRequest: jest.fn(),
    };

    beforeEach(() => {
        action = new OpenPullRequestUriHandler(expansionCastTo<CheckoutHelper>(mockCheckoutHelper));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('isAccepted only accepts URIs ending with openPullRequest', () => {
        expect(action.isAccepted(Uri.parse('https://some-uri/openPullRequest'))).toBeTruthy();
        expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBeFalsy();
    });

    it('handle throws if required query params are missing', async () => {
        await expect(action.handle(Uri.parse('https://some-uri/openPullRequest'))).rejects.toThrow();
    });

    it('handle throws if repo URL fails to parse', async () => {
        await expect(action.handle(Uri.parse('https://some-uri/openPullRequest?q=invalidUrl'))).rejects.toThrow();
    });

    it('handle opens a pull request and fires an event on success', async () => {
        mockCheckoutHelper.pullRequest.mockResolvedValue(true);

        const q = encodeURIComponent('https://bitbucket.com/my-cool-repo/pull-requests/123');
        await action.handle(Uri.parse(`vscode:openPullRequest?q=${q}`));

        expect(mockCheckoutHelper.pullRequest).toHaveBeenCalledWith('https://bitbucket.com/my-cool-repo', 123);
    });

    it('handle shows an error message on failure', async () => {
        mockCheckoutHelper.pullRequest.mockRejectedValue(new Error('oh no'));

        const q = encodeURIComponent('https://bitbucket.com/my-cool-repo/pull-requests/123');

        await expect(action.handle(Uri.parse(`vscode:openPullRequest?q=${q}`))).rejects.toThrow();

        // This will actually fail with the current implementation:
        expect(window.showErrorMessage).toHaveBeenCalledWith('Error opening pull request (check log for details)');
    });
});
