import { Uri, window } from 'vscode';

const mockStartWork = jest.fn();
jest.mock('../../commands/jira/startWorkOnIssue', () => ({
    startWorkOnIssue: mockStartWork,
}));
import { StartWorkUriHandlerAction } from './startWork';

describe('StartWorkAction', () => {
    const mockAnalyticsApi = {
        fireDeepLinkEvent: jest.fn(),
    };
    const mockFetcher = {
        fetchIssue: jest.fn(),
    };
    let action: StartWorkUriHandlerAction;

    beforeEach(() => {
        jest.clearAllMocks();
        action = new StartWorkUriHandlerAction(mockAnalyticsApi as any, mockFetcher as any);
    });

    describe('isAccepted', () => {
        it('only accepts URIs ending with startWorkOnJiraIssue', () => {
            expect(action.isAccepted(Uri.parse('https://some-uri/startWorkOnJiraIssue'))).toBe(true);
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBe(false);
        });
    });

    describe('handle', () => {
        it('throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse('https://some-uri/startWork'))).rejects.toThrow();
            await expect(action.handle(Uri.parse('https://some-uri/startWork?issueKey=AXON-123'))).rejects.toThrow();
            await expect(action.handle(Uri.parse('https://some-uri/startWork?site=localhost'))).rejects.toThrow();
        });

        it('shows error if the issue could not be fetched', async () => {
            mockFetcher.fetchIssue.mockRejectedValue(new Error('oh no'));
            await expect(
                action.handle(Uri.parse('https://some-uri/startWork?issueKey=AXON-123&site=localhost')),
            ).resolves.toBeUndefined();
            expect(window.showErrorMessage).toHaveBeenCalled();
        });

        it('shows the Start Work view, and fires an analytics event if everything is good', async () => {
            mockFetcher.fetchIssue.mockResolvedValue({ some: 'issue' });
            await action.handle(Uri.parse('https://some-uri/startWork?issueKey=AXON-123&site=localhost'));
            expect(mockStartWork).toHaveBeenCalledWith({ some: 'issue' });
            expect(mockAnalyticsApi.fireDeepLinkEvent).toHaveBeenCalled();
        });
    });
});
