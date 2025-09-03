import { isIssueKeyAndSite, isMinimalIssue, MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { expansionCastTo, forceCastTo } from 'testsutil';
import { commands } from 'vscode';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Commands } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { OnJiraEditedRefreshDelay } from '../util/time';
import { transitionIssue } from './transitionIssue';

// Mock dependencies
jest.mock('../analytics', () => ({
    issueTransitionedEvent: () => Promise.resolve({ eventName: 'issueTransitionedEvent' }),
}));

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

jest.mock('../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));

// Mock types for easier testing
jest.mock('@atlassianlabs/jira-pi-common-models', () => {
    const original = jest.requireActual('@atlassianlabs/jira-pi-common-models');
    return {
        ...original,
        isMinimalIssue: jest.fn(),
        isIssueKeyAndSite: jest.fn(),
    };
});

describe('transitionIssue', () => {
    const isMinimalIssueMock: jest.Mock = isMinimalIssue as any;
    const isIssueKeyAndSiteMock: jest.Mock = isIssueKeyAndSite as any;

    const mockedTransition = expansionCastTo<Transition>({
        id: 'transition-1',
        name: 'In Progress',
        to: {
            self: '',
            id: 'status-1',
            name: 'In Progress',
            description: 'description',
            iconUrl: '',
            statusCategory: {
                self: '',
                id: 1,
                key: 'indeterminate',
                colorName: 'yellow',
                name: 'In Progress',
            },
        },
    });

    const mockedSiteDetails = forceCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
        host: 'test.atlassian.net',
    });

    const mockedIssue = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
        id: 'issue-1',
        key: 'TEST-123',
        summary: 'Test Issue',
        siteDetails: mockedSiteDetails,
    });

    const mockJiraClient = {
        transitionIssue: jest.fn().mockResolvedValue({}),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockJiraClient);
    });

    it('should handle a MinimalIssue correctly', async () => {
        // Setup
        isMinimalIssueMock.mockReturnValue(true);
        isIssueKeyAndSiteMock.mockReturnValue(false);

        // Execute
        await transitionIssue(mockedIssue, mockedTransition);

        // Verify
        expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockedSiteDetails);
        expect(mockJiraClient.transitionIssue).toHaveBeenCalledWith('TEST-123', 'transition-1');
        expect(commands.executeCommand).toHaveBeenCalledWith(
            Commands.RefreshAssignedWorkItemsExplorer,
            OnJiraEditedRefreshDelay,
        );
        expect(commands.executeCommand).toHaveBeenCalledWith(
            Commands.RefreshCustomJqlExplorer,
            OnJiraEditedRefreshDelay,
        );
        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalled();
    });

    it('should handle an IssueKeyAndSite object correctly', async () => {
        // Setup
        const issueKeyAndSite = {
            key: 'TEST-123',
            siteDetails: mockedSiteDetails,
        };
        isMinimalIssueMock.mockReturnValue(false);
        isIssueKeyAndSiteMock.mockReturnValue(true);

        // Execute
        await transitionIssue(issueKeyAndSite, mockedTransition);

        // Verify
        expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockedSiteDetails);
        expect(mockJiraClient.transitionIssue).toHaveBeenCalledWith('TEST-123', 'transition-1');
        expect(commands.executeCommand).toHaveBeenCalledWith(
            Commands.RefreshAssignedWorkItemsExplorer,
            OnJiraEditedRefreshDelay,
        );
        expect(commands.executeCommand).toHaveBeenCalledWith(
            Commands.RefreshCustomJqlExplorer,
            OnJiraEditedRefreshDelay,
        );
        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalled();
    });

    it('should throw an error for invalid input', async () => {
        // Setup
        isMinimalIssueMock.mockReturnValue(false);
        isIssueKeyAndSiteMock.mockReturnValue(false);

        // Execute and verify
        await expect(transitionIssue({} as any, mockedTransition)).rejects.toThrow('invalid issue or key');
    });

    it('should handle errors from jiraClient', async () => {
        // Setup
        const error = new Error('API error');
        isMinimalIssueMock.mockReturnValue(true);
        mockJiraClient.transitionIssue.mockRejectedValue(error);

        // Execute and verify
        await expect(transitionIssue(mockedIssue, mockedTransition)).rejects.toThrow('API error');
        expect(Logger.error).toHaveBeenCalledWith(error, 'Error executing transitionIssue');
    });

    it('should handle errors from transitionIssue API call', async () => {
        // Setup
        const error = new Error('Transition failed');
        isMinimalIssueMock.mockReturnValue(true);
        mockJiraClient.transitionIssue.mockRejectedValue(error);

        // Execute and verify
        await expect(transitionIssue(mockedIssue, mockedTransition)).rejects.toEqual(error);
        expect(Logger.error).toHaveBeenCalledWith(error, 'Error executing transitionIssue');
    });
});
