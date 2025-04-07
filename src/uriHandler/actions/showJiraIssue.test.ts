import { Uri, window } from 'vscode';

jest.mock('../../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));
import { showIssue } from '../../commands/jira/showIssue';
import { ShowJiraIssueUriHandlerAction } from './showJiraIssue';

describe('ShowJiraIssueUriHandlerAction', () => {
    const mockAnalyticsApi = {
        fireDeepLinkEvent: jest.fn(),
    };
    const mockFetcher = {
        fetchIssue: jest.fn(),
    };
    let action: ShowJiraIssueUriHandlerAction;

    beforeEach(() => {
        jest.clearAllMocks();
        action = new ShowJiraIssueUriHandlerAction(mockAnalyticsApi as any, mockFetcher as any);
    });

    describe('isAccepted', () => {
        it('only accepts URIs ending with showJiraIssue', () => {
            expect(action.isAccepted(Uri.parse('https://some-uri/showJiraIssue'))).toBe(true);
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBe(false);
        });
    });

    describe('handle', () => {
        it('throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse('https://some-uri/showJiraIssue'))).rejects.toThrow();
            await expect(
                action.handle(Uri.parse('https://some-uri/showJiraIssue?issueKey=AXON-123')),
            ).rejects.toThrow();
        });

        it('shows error if the issue could not be fetched', async () => {
            mockFetcher.fetchIssue.mockRejectedValue(new Error('oh no'));
            await expect(
                action.handle(Uri.parse('https://some-uri/showJiraIssue?issueKey=AXON-123&site=jira')),
            ).resolves.toBeUndefined();
            expect(window.showErrorMessage).toHaveBeenCalled();
        });

        it('shows the Jira issue and fires an analytics event if everything is good', async () => {
            mockFetcher.fetchIssue.mockResolvedValue({ some: 'issue' });
            await action.handle(Uri.parse('https://some-uri/showJiraIssue?issueKey=AXON-123&site=jira'));
            expect(showIssue).toHaveBeenCalledWith({ some: 'issue' });
            expect(mockAnalyticsApi.fireDeepLinkEvent).toHaveBeenCalled();
        });
    });
});
