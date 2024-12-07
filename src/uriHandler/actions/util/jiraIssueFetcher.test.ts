import { window } from 'vscode';

const mockSiteInfo = {
    id: 'one',
    baseLinkUrl: 'https://jira.com',
    isCloud: true,
};

const mockFindIssue = jest.fn();
const mockFetchIssue = jest.fn();

jest.mock('../../../jira/fetchIssue', () => ({
    fetchMinimalIssue: mockFetchIssue,
}));

jest.mock('../../../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: jest.fn().mockImplementation(() => [mockSiteInfo]),
        },
        settingsWebviewFactory: {
            createOrShow: jest.fn(),
        },
        jiraExplorer: {
            findIssue: mockFindIssue,
        },
    },
}));
import { Container } from '../../../container';
import { JiraIssueFetcher } from './jiraIssueFetcher';

describe('JiraIssueFetcher', () => {
    let fetcher: JiraIssueFetcher;
    const mockShowInformationMessage: jest.Mock = window.showInformationMessage as any;

    beforeEach(() => {
        jest.clearAllMocks();
        fetcher = new JiraIssueFetcher();
    });

    describe('fetchIssue', () => {
        it('fetches the issue if found', async () => {
            fetcher.findMatchingSite = jest.fn().mockReturnValue(mockSiteInfo);
            fetcher.findIssueOnSite = jest.fn().mockResolvedValue({ issue: 'found' });
            await expect(fetcher.fetchIssue('AXON-123', 'https://jira.com')).resolves.toEqual({ issue: 'found' });
        });

        it('throws an error if the site is not found', async () => {
            fetcher.findMatchingSite = jest.fn().mockReturnValue(undefined);
            await expect(fetcher.fetchIssue('AXON-123', 'https://github.com')).rejects.toThrowError();
        });

        it('throws an error if the issue is not found', async () => {
            fetcher.findMatchingSite = jest.fn().mockReturnValue(mockSiteInfo);
            fetcher.findIssueOnSite = jest.fn().mockResolvedValue(undefined);
            await expect(fetcher.fetchIssue('AXON-123', 'https://jira.com')).rejects.toThrowError();
        });
    });

    describe('findMatchingSite', () => {
        it('returns the matching site if found', () => {
            expect(fetcher.findMatchingSite('jira')).toBe(mockSiteInfo);
        });

        it('returns undefined if no matching site is found', () => {
            expect(fetcher.findMatchingSite('github')).toBeUndefined();
        });
    });

    describe('findIssueOnSite', () => {
        it('returns the issue if found', async () => {
            mockFindIssue.mockResolvedValue({ issue: 'found' });
            mockFetchIssue.mockResolvedValue({ issue: 'found' });
            await expect(fetcher.findIssueOnSite('AXON-123', mockSiteInfo as any)).resolves.toEqual({ issue: 'found' });
        });

        it('returns undefined if the issue is not found', async () => {
            mockFindIssue.mockResolvedValue({ issue: 'found' });
            mockFetchIssue.mockResolvedValue(undefined);
            await expect(fetcher.findIssueOnSite('AXON-123', mockSiteInfo as any)).resolves.toBeUndefined();
        });

        it('returns undefined if the issue failed to fetch', async () => {
            mockFindIssue.mockResolvedValue(undefined);
            await expect(fetcher.findIssueOnSite('AXON-123', mockSiteInfo as any)).resolves.toBeUndefined();
        });
    });

    describe('handleSiteNotFound', () => {
        it('shows settings if the user selects `Open oauth settings`', async () => {
            mockShowInformationMessage.mockResolvedValue('Open auth settings');
            await expect(fetcher.handleSiteNotFound('AXON-123', 'https://jira.com')).resolves.toBeUndefined();
            expect(mockShowInformationMessage).toHaveBeenCalled();
            expect(Container.settingsWebviewFactory.createOrShow).toHaveBeenCalled();
        });

        it('does nothing otherwise', async () => {
            mockShowInformationMessage.mockResolvedValue('literally anything else');
            await expect(fetcher.handleSiteNotFound('AXON-123', 'https://jira.com')).resolves.toBeUndefined();
            expect(mockShowInformationMessage).toHaveBeenCalled();
            expect(Container.settingsWebviewFactory.createOrShow).not.toHaveBeenCalled();
        });
    });
});
