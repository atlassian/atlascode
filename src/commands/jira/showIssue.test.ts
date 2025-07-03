import { createEmptyMinimalIssue, createIssueNotFoundIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';

import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { getCachedOrFetchMinimalIssue } from '../../jira/fetchIssue';
import { issueForKey } from '../../jira/issueForKey';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey, showIssueForURL } from './showIssue';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../jira/fetchIssue');
jest.mock('../../jira/issueForKey');
jest.mock('../../container');
jest.mock('@atlassianlabs/jira-pi-common-models', () => {
    const actual = jest.requireActual('@atlassianlabs/jira-pi-common-models');
    return {
        ...actual,
        isMinimalIssue: jest.fn(),
        isIssueKeyAndSite: jest.fn(),
    };
});

describe('showIssue module', () => {
    // Common test data
    const mockIssue = {
        key: 'TEST-123',
        id: '12345',
        summary: 'Test issue',
        siteDetails: {
            ...emptySiteInfo,
            id: 'site-1',
            host: 'https://test.atlassian.net',
        },
    } as unknown as MinimalIssue<DetailedSiteInfo>;

    const mockCreateOrShow = jest.fn();

    // Import the mocked functions to simplify type checks
    const modelFunctions = require('@atlassianlabs/jira-pi-common-models');

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Container's jiraIssueViewManager
        (Container.jiraIssueViewManager as any) = {
            createOrShow: mockCreateOrShow,
        };

        // Mock Container's siteManager
        (Container.siteManager as any) = {
            getSiteForHostname: jest.fn(),
            getSiteForId: jest.fn(),
            getSitesAvailable: jest.fn(),
        };

        // Mock fetchIssue functions
        (getCachedOrFetchMinimalIssue as jest.Mock).mockResolvedValue(mockIssue);
        (issueForKey as jest.Mock).mockResolvedValue(mockIssue);
    });

    describe('showIssueForKey', () => {
        it('should fetch and show issue for provided key', async () => {
            const issueKey = 'TEST-123';

            await showIssueForKey(issueKey);

            expect(issueForKey).toHaveBeenCalledWith(issueKey);
            expect(mockCreateOrShow).toHaveBeenCalledWith(mockIssue);
            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
        });

        it('should prompt for issue key if not provided', async () => {
            const inputIssueKey = 'TEST-456';
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(inputIssueKey);

            await showIssueForKey();

            expect(vscode.window.showInputBox).toHaveBeenCalled();
            expect(issueForKey).toHaveBeenCalledWith(inputIssueKey);
            expect(mockCreateOrShow).toHaveBeenCalledWith(mockIssue);
        });

        it('should show issue not found when issue key lookup fails', async () => {
            const issueKey = 'TEST-404';
            (issueForKey as jest.Mock).mockRejectedValue(new Error('Not found'));

            await showIssueForKey(issueKey);

            expect(issueForKey).toHaveBeenCalledWith(issueKey);
            // Verify it's showing the "not found" issue
            const notFoundIssue = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));
            expect(mockCreateOrShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: notFoundIssue.key,
                }),
            );
        });

        it('should show issue not found when user cancels input', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            await showIssueForKey();

            expect(vscode.window.showInputBox).toHaveBeenCalled();
            expect(issueForKey).not.toHaveBeenCalled();
            // Verify it's showing the "not found" issue
            const notFoundIssue = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));
            expect(mockCreateOrShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: notFoundIssue.key,
                }),
            );
        });
    });

    describe('showIssueForSiteIdAndKey', () => {
        it('should fetch and show issue for valid site ID and key', async () => {
            const siteId = 'site-1';
            const issueKey = 'TEST-123';
            const mockSite = {
                id: siteId,
                host: 'test.atlassian.net',
                product: ProductJira,
            };

            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(mockSite);

            await showIssueForSiteIdAndKey(siteId, issueKey);

            expect(Container.siteManager.getSiteForId).toHaveBeenCalledWith(ProductJira, siteId);
            expect(getCachedOrFetchMinimalIssue).toHaveBeenCalledWith(issueKey, mockSite);
            expect(mockCreateOrShow).toHaveBeenCalledWith(mockIssue);
        });

        it('should show issue not found when site ID is invalid', async () => {
            const siteId = 'invalid-site';
            const issueKey = 'TEST-123';

            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(undefined);

            await showIssueForSiteIdAndKey(siteId, issueKey);

            expect(Container.siteManager.getSiteForId).toHaveBeenCalledWith(ProductJira, siteId);
            expect(getCachedOrFetchMinimalIssue).not.toHaveBeenCalled();
            expect(mockCreateOrShow).toHaveBeenCalled();
            // Verify it's showing the "not found" issue
            const notFoundIssue = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));
            expect(mockCreateOrShow.mock.calls[0][0]).toMatchObject({ key: notFoundIssue.key });
        });
    });

    describe('showIssueForURL', () => {
        it('should extract issue key and site from URL and show the issue', async () => {
            const url = 'https://test.atlassian.net/browse/TEST-123';
            const mockSite = {
                id: 'site-1',
                host: 'test.atlassian.net',
                product: ProductJira,
            };

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(mockSite);
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(mockSite);

            await showIssueForURL(url);

            expect(Container.siteManager.getSiteForHostname).toHaveBeenCalledWith(ProductJira, 'test.atlassian.net');
            expect(getCachedOrFetchMinimalIssue).toHaveBeenCalledWith('TEST-123', mockSite);
            expect(mockCreateOrShow).toHaveBeenCalled();
        });

        it('should show error when issue key is not found in URL', async () => {
            const url = 'https://test.atlassian.net/browse/invalid';
            const mockShowErrorMessage = jest.fn();
            (vscode.window.showErrorMessage as jest.Mock) = mockShowErrorMessage;

            await showIssueForURL(url);

            expect(mockShowErrorMessage).toHaveBeenCalledWith('Invalid URL.');
            expect(mockCreateOrShow).not.toHaveBeenCalled();
        });

        it('should show error when site is not found for hostname', async () => {
            const url = 'https://unknown.atlassian.net/browse/TEST-123';
            const mockShowErrorMessage = jest.fn();
            (vscode.window.showErrorMessage as jest.Mock) = mockShowErrorMessage;

            (Container.siteManager.getSiteForHostname as jest.Mock).mockReturnValue(null);

            await showIssueForURL(url);

            expect(mockShowErrorMessage).toHaveBeenCalledWith('Invalid URL.');
            expect(mockCreateOrShow).not.toHaveBeenCalled();
        });
    });

    describe('showIssue', () => {
        it('should show issue when MinimalIssue is provided', async () => {
            // Setup the mock to identify our mockIssue as a MinimalIssue
            modelFunctions.isMinimalIssue.mockReturnValue(true);

            await showIssue(mockIssue);

            expect(mockCreateOrShow).toHaveBeenCalledWith(mockIssue);
            expect(getCachedOrFetchMinimalIssue).not.toHaveBeenCalled();
        });

        it('should fetch and show issue when issue key and site are provided', async () => {
            // Setup mocks for this test
            modelFunctions.isMinimalIssue.mockReturnValue(false);
            modelFunctions.isIssueKeyAndSite.mockReturnValue(true);

            const keyAndSite = {
                key: 'TEST-123',
                siteDetails: mockIssue.siteDetails,
            };

            await showIssue(keyAndSite);

            expect(getCachedOrFetchMinimalIssue).toHaveBeenCalledWith('TEST-123', mockIssue.siteDetails);
            expect(mockCreateOrShow).toHaveBeenCalledWith(mockIssue);
        });

        it('should show issue not found when neither MinimalIssue nor key and site are provided', async () => {
            // Setup mocks for this test
            modelFunctions.isMinimalIssue.mockReturnValue(false);
            modelFunctions.isIssueKeyAndSite.mockReturnValue(false);

            // Cast to any to bypass type checking for this test case
            await showIssue({} as any);

            const notFoundIssue = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));
            expect(mockCreateOrShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: notFoundIssue.key,
                }),
            );
        });

        it('should throw error if issue cannot be fetched', async () => {
            // Setup mocks for this test
            modelFunctions.isMinimalIssue.mockReturnValue(false);
            modelFunctions.isIssueKeyAndSite.mockReturnValue(true);
            (getCachedOrFetchMinimalIssue as jest.Mock).mockResolvedValue(null);

            const keyAndSite = {
                key: 'TEST-404',
                siteDetails: mockIssue.siteDetails,
            };

            await expect(showIssue(keyAndSite)).rejects.toThrow(
                `Jira issue TEST-404 not found in site ${mockIssue.siteDetails.host}`,
            );
        });
    });
});
