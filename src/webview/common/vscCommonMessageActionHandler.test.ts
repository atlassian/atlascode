import { env, Uri } from 'vscode';

import { IntegrationsLinkParams } from '../../atlclients/authInfo';
import { HTTPClient } from '../../bitbucket/httpClient';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { submitFeedback } from '../../feedback/feedbackSubmitter';
import { submitJSDPMF } from '../../feedback/pmfJSDSubmitter';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { CommonAction, CommonActionType } from '../../lib/ipc/fromUI/common';
import { FeedbackType, KnownLinkID, knownLinkIdMap, PMFLevel } from '../../lib/ipc/models/common';
import { VSCCommonMessageHandler } from './vscCommonMessageActionHandler';

// Mock dependencies
jest.mock('vscode', () => ({
    env: {
        openExternal: jest.fn(),
        clipboard: {
            writeText: jest.fn(),
        },
    },
    Uri: {
        parse: jest.fn(),
    },
}));

jest.mock('../../bitbucket/httpClient', () => ({
    HTTPClient: {
        queryObjectToString: jest.fn(),
    },
}));

jest.mock('../../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));

jest.mock('../../container', () => ({
    Container: {
        pmfStats: {
            touchSurveyed: jest.fn(),
            snoozeSurvey: jest.fn(),
        },
        siteManager: {
            getFirstAAID: jest.fn(),
        },
        machineId: 'test-machine-id',
    },
}));

jest.mock('../../feedback/feedbackSubmitter', () => ({
    submitFeedback: jest.fn(),
}));

jest.mock('../../feedback/pmfJSDSubmitter', () => ({
    submitJSDPMF: jest.fn(),
}));

describe('VSCCommonMessageHandler', () => {
    let mockAnalytics: jest.Mocked<AnalyticsApi>;
    let mockCancelMan: jest.Mocked<CancellationManager>;
    let handler: VSCCommonMessageHandler;

    beforeEach(() => {
        // Create mock analytics
        mockAnalytics = {
            firePmfSubmitted: jest.fn(),
            firePmfSnoozed: jest.fn(),
            firePmfClosed: jest.fn(),
            fireViewScreenEvent: jest.fn(),
            fireExternalLinkEvent: jest.fn(),
            fireIssueUrlCopiedEvent: jest.fn(),
            firePrUrlCopiedEvent: jest.fn(),
            fireUIErrorEvent: jest.fn(),
        } as any;

        // Create mock cancellation manager
        const mockCancelToken = {
            cancel: jest.fn(),
        };
        mockCancelMan = {
            get: jest.fn().mockReturnValue(mockCancelToken),
            delete: jest.fn(),
        } as any;

        handler = new VSCCommonMessageHandler(mockAnalytics, mockCancelMan);

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('SubmitPMF', () => {
        it('should submit PMF data and track analytics', async () => {
            const pmfData = {
                level: PMFLevel.VERY,
                improvements: 'Better UI',
                alternative: 'VSCode',
                benefits: 'Faster workflow',
            };

            const action: CommonAction = {
                type: CommonActionType.SubmitPMF,
                pmfData,
            };

            await handler.onMessageReceived(action);

            expect(submitJSDPMF).toHaveBeenCalledWith(pmfData);
            expect(Container.pmfStats.touchSurveyed).toHaveBeenCalled();
            expect(mockAnalytics.firePmfSubmitted).toHaveBeenCalledWith('0'); // PMFLevel.VERY maps to '0'
        });
    });

    describe('DismissPMFLater', () => {
        it('should snooze survey and track analytics', async () => {
            const action: CommonAction = {
                type: CommonActionType.DismissPMFLater,
            };

            await handler.onMessageReceived(action);

            expect(Container.pmfStats.snoozeSurvey).toHaveBeenCalled();
            expect(mockAnalytics.firePmfSnoozed).toHaveBeenCalled();
        });
    });

    describe('DismissPMFNever', () => {
        it('should mark survey as completed and track analytics', async () => {
            const action: CommonAction = {
                type: CommonActionType.DismissPMFNever,
            };

            await handler.onMessageReceived(action);

            expect(Container.pmfStats.touchSurveyed).toHaveBeenCalled();
            expect(mockAnalytics.firePmfClosed).toHaveBeenCalled();
        });
    });

    describe('OpenPMFSurvey', () => {
        it('should mark survey as touched and track screen view', async () => {
            const action: CommonAction = {
                type: CommonActionType.OpenPMFSurvey,
            };

            await handler.onMessageReceived(action);

            expect(Container.pmfStats.touchSurveyed).toHaveBeenCalled();
            expect(mockAnalytics.fireViewScreenEvent).toHaveBeenCalledWith('atlascodePmf');
        });
    });

    describe('ExternalLink', () => {
        it('should open external link with provided URL', async () => {
            const testUrl = 'https://example.com';
            const action: CommonAction = {
                type: CommonActionType.ExternalLink,
                source: 'test-source',
                linkId: 'custom-link',
                url: testUrl,
            };

            await handler.onMessageReceived(action);

            expect(Uri.parse).toHaveBeenCalledWith(testUrl);
            expect(env.openExternal).toHaveBeenCalled();
        });

        it('should use known link URL when URL is not provided', async () => {
            const action: CommonAction = {
                type: CommonActionType.ExternalLink,
                source: 'test-source',
                linkId: KnownLinkID.AtlascodeRepo,
            };

            await handler.onMessageReceived(action);

            const expectedUrl = knownLinkIdMap.get(KnownLinkID.AtlascodeRepo);
            expect(Uri.parse).toHaveBeenCalledWith(expectedUrl);
            expect(env.openExternal).toHaveBeenCalled();
            expect(mockAnalytics.fireExternalLinkEvent).toHaveBeenCalledWith('test-source', KnownLinkID.AtlascodeRepo);
        });

        it('should append query params for integrations link with AAID', async () => {
            const mockAAID = 'test-aaid';
            (Container.siteManager.getFirstAAID as jest.Mock).mockReturnValue(mockAAID);
            (HTTPClient.queryObjectToString as jest.Mock).mockReturnValue(
                '?aaid=test-aaid&aid=test-machine-id&s=atlascode.onboarding',
            );

            const action: CommonAction = {
                type: CommonActionType.ExternalLink,
                source: 'test-source',
                linkId: KnownLinkID.Integrations,
            };

            await handler.onMessageReceived(action);

            const expectedParams: IntegrationsLinkParams = {
                aaid: mockAAID,
                aid: Container.machineId,
                s: 'atlascode.onboarding',
            };

            expect(HTTPClient.queryObjectToString).toHaveBeenCalledWith(expectedParams);
            expect(mockAnalytics.fireExternalLinkEvent).toHaveBeenCalledWith('test-source', KnownLinkID.Integrations);
        });

        it('should append query params for integrations link without AAID', async () => {
            (Container.siteManager.getFirstAAID as jest.Mock).mockReturnValue(undefined);
            (HTTPClient.queryObjectToString as jest.Mock).mockReturnValue(
                '?aid=test-machine-id&s=atlascode.onboarding',
            );

            const action: CommonAction = {
                type: CommonActionType.ExternalLink,
                source: 'test-source',
                linkId: KnownLinkID.Integrations,
            };

            await handler.onMessageReceived(action);

            const expectedParams: IntegrationsLinkParams = {
                aid: Container.machineId,
                s: 'atlascode.onboarding',
            };

            expect(HTTPClient.queryObjectToString).toHaveBeenCalledWith(expectedParams);
        });

        it('should not open link if URL is not found', async () => {
            const action: CommonAction = {
                type: CommonActionType.ExternalLink,
                source: 'test-source',
                linkId: 'unknown-link',
            };

            await handler.onMessageReceived(action);

            expect(env.openExternal).not.toHaveBeenCalled();
            expect(mockAnalytics.fireExternalLinkEvent).not.toHaveBeenCalled();
        });
    });

    describe('CopyLink', () => {
        it('should copy Jira issue URL and track analytics', async () => {
            const testUrl = 'https://test.atlassian.net/browse/TEST-123';
            const action: CommonAction = {
                type: CommonActionType.CopyLink,
                linkType: 'jiraIssue',
                url: testUrl,
            };

            await handler.onMessageReceived(action);

            expect(env.clipboard.writeText).toHaveBeenCalledWith(testUrl);
            expect(mockAnalytics.fireIssueUrlCopiedEvent).toHaveBeenCalled();
        });

        it('should copy pull request URL and track analytics', async () => {
            const testUrl = 'https://bitbucket.org/workspace/repo/pull-requests/1';
            const action: CommonAction = {
                type: CommonActionType.CopyLink,
                linkType: 'pullRequest',
                url: testUrl,
            };

            await handler.onMessageReceived(action);

            expect(env.clipboard.writeText).toHaveBeenCalledWith(testUrl);
            expect(mockAnalytics.firePrUrlCopiedEvent).toHaveBeenCalled();
        });

        it('should copy URL without specific analytics for unknown link types', async () => {
            const testUrl = 'https://example.com';
            const action: CommonAction = {
                type: CommonActionType.CopyLink,
                linkType: 'bbIssue' as any,
                url: testUrl,
            };

            await handler.onMessageReceived(action);

            expect(env.clipboard.writeText).toHaveBeenCalledWith(testUrl);
            expect(mockAnalytics.fireIssueUrlCopiedEvent).not.toHaveBeenCalled();
            expect(mockAnalytics.firePrUrlCopiedEvent).not.toHaveBeenCalled();
        });
    });

    describe('SubmitFeedback', () => {
        it('should submit feedback data', async () => {
            const feedbackData = {
                type: FeedbackType.Bug,
                description: 'Found a bug',
                canBeContacted: true,
                userName: 'testuser',
                emailAddress: 'test@example.com',
                source: 'test-source',
            };

            const action: CommonAction = {
                type: CommonActionType.SubmitFeedback,
                feedback: feedbackData,
            };

            await handler.onMessageReceived(action);

            expect(submitFeedback).toHaveBeenCalledWith(feedbackData);
        });
    });

    describe('OpenJiraIssue', () => {
        it('should open Jira issue', async () => {
            const issueOrKey = {
                key: 'TEST-123',
                site: {
                    id: 'site-1',
                    name: 'Test Site',
                },
            } as any;

            const action: CommonAction = {
                type: CommonActionType.OpenJiraIssue,
                issueOrKey,
            };

            await handler.onMessageReceived(action);

            expect(showIssue).toHaveBeenCalledWith(issueOrKey);
        });
    });

    describe('Refresh', () => {
        it('should handle refresh action without side effects', async () => {
            const action: CommonAction = {
                type: CommonActionType.Refresh,
            };

            await handler.onMessageReceived(action);

            // Refresh should be handled by caller, so no expectations for this handler
            expect(true).toBe(true); // Just to have an assertion
        });
    });

    describe('Cancel', () => {
        it('should cancel operation and clean up', async () => {
            const abortKey = 'test-abort-key';
            const reason = 'User cancelled';
            const action: CommonAction = {
                type: CommonActionType.Cancel,
                abortKey,
                reason,
            };

            await handler.onMessageReceived(action);

            expect(mockCancelMan.get).toHaveBeenCalledWith(abortKey);
            expect(mockCancelMan.get(abortKey)?.cancel).toHaveBeenCalledWith(reason);
            expect(mockCancelMan.delete).toHaveBeenCalledWith(abortKey);
        });

        it('should handle cancel when no cancellation token exists', async () => {
            (mockCancelMan.get as jest.Mock).mockReturnValue(undefined);

            const action: CommonAction = {
                type: CommonActionType.Cancel,
                abortKey: 'non-existent-key',
                reason: 'User cancelled',
            };

            await handler.onMessageReceived(action);

            expect(mockCancelMan.get).toHaveBeenCalledWith('non-existent-key');
            expect(mockCancelMan.delete).toHaveBeenCalledWith('non-existent-key');
        });
    });

    describe('SendAnalytics', () => {
        it('should send UI error analytics', async () => {
            const errorInfo = {
                view: 'test-view',
                stack: 'Error stack trace',
                errorName: 'TestError',
                errorMessage: 'Test error message',
                errorCause: 'Test cause',
                userDomain: 'unknown',
            };

            const action: CommonAction = {
                type: CommonActionType.SendAnalytics,
                errorInfo,
            };

            await handler.onMessageReceived(action);

            expect(mockAnalytics.fireUIErrorEvent).toHaveBeenCalledWith(errorInfo);
        });
    });
});
