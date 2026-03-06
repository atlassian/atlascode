import * as analytics from './analytics';
import { AnalyticsClient } from './analytics-node-client/src/client.min.js';
import { UIErrorInfo } from './analyticsTypes';
import { DetailedSiteInfo, Product, SiteInfo } from './atlclients/authInfo';
import { VSCAnalyticsApi } from './vscAnalyticsApi';

jest.spyOn(analytics, 'installedEvent');
jest.spyOn(analytics, 'upgradedEvent');
jest.spyOn(analytics, 'launchedEvent');
jest.spyOn(analytics, 'featureChangeEvent');
jest.spyOn(analytics, 'authenticatedEvent');
jest.spyOn(analytics, 'loggedOutEvent');
jest.spyOn(analytics, 'issueCreatedEvent');
jest.spyOn(analytics, 'issueTransitionedEvent');
jest.spyOn(analytics, 'issueUrlCopiedEvent');
jest.spyOn(analytics, 'issueCommentEvent');
jest.spyOn(analytics, 'issueWorkStartedEvent');
jest.spyOn(analytics, 'issueUpdatedEvent');
jest.spyOn(analytics, 'startIssueCreationEvent');
jest.spyOn(analytics, 'prCreatedEvent');
jest.spyOn(analytics, 'prCommentEvent');
jest.spyOn(analytics, 'prTaskEvent');
jest.spyOn(analytics, 'prCheckoutEvent');
jest.spyOn(analytics, 'prApproveEvent');
jest.spyOn(analytics, 'prMergeEvent');
jest.spyOn(analytics, 'prUrlCopiedEvent');
jest.spyOn(analytics, 'customJQLCreatedEvent');
jest.spyOn(analytics, 'pipelineStartEvent');
jest.spyOn(analytics, 'pmfSubmitted');
jest.spyOn(analytics, 'pmfSnoozed');
jest.spyOn(analytics, 'pmfClosed');
jest.spyOn(analytics, 'deepLinkEvent');
jest.spyOn(analytics, 'externalLinkEvent');
jest.spyOn(analytics, 'viewScreenEvent');
jest.spyOn(analytics, 'bbIssuesPaginationEvent');
jest.spyOn(analytics, 'prPaginationEvent');
jest.spyOn(analytics, 'moreSettingsButtonEvent');
jest.spyOn(analytics, 'doneButtonEvent');
jest.spyOn(analytics, 'focusCreateIssueEvent');
jest.spyOn(analytics, 'focusIssueEvent');
jest.spyOn(analytics, 'focusCreatePullRequestEvent');
jest.spyOn(analytics, 'focusPullRequestEvent');
jest.spyOn(analytics, 'authenticateButtonEvent');
jest.spyOn(analytics, 'logoutButtonEvent');
jest.spyOn(analytics, 'saveManualCodeEvent');
jest.spyOn(analytics, 'openSettingsButtonEvent');
jest.spyOn(analytics, 'exploreFeaturesButtonEvent');
jest.spyOn(analytics, 'pipelineRerunEvent');
jest.spyOn(analytics, 'uiErrorEvent');

describe('VSCAnalyticsApi', () => {
    let mockAnalyticsClient: AnalyticsClient;
    let analyticsApi: VSCAnalyticsApi;
    let mockSite: DetailedSiteInfo;

    beforeEach(() => {
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
            sendScreenEvent: jest.fn(),
            sendUIEvent: jest.fn(),
        } as unknown as AnalyticsClient;

        analyticsApi = new VSCAnalyticsApi(mockAnalyticsClient, false, false);

        mockSite = {
            id: 'test-site-id',
            name: 'Test Site',
            product: { key: 'jira', name: 'Jira' } as Product,
            avatarUrl: '',
            isCloud: true,
            baseApiUrl: '',
            baseLinkUrl: '',
            userId: 'test-user-id',
            credentialId: 'test-credential-id',
            host: 'test-host',
        };

        // Reset all spies
        jest.clearAllMocks();
    });

    describe('track events', () => {
        it('should fire installed event', async () => {
            const version = '1.0.0';
            await analyticsApi.fireInstalledEvent(version);

            expect(analytics.installedEvent).toHaveBeenCalledWith(version);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire upgraded event', async () => {
            const version = '1.0.0';
            const previousVersion = '0.9.0';
            await analyticsApi.fireUpgradedEvent(version, previousVersion);

            expect(analytics.upgradedEvent).toHaveBeenCalledWith(version, previousVersion);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire launched event', async () => {
            const location = 'test-location';
            const ideUriScheme = 'vscode';
            const numJiraCloudAuthed = 1;
            const numJiraDcAuthed = 2;
            const numBitbucketCloudAuthed = 3;
            const numBitbucketDcAuthed = 4;
            const isJiraEnabled = true;
            const isBitbucketEnabled = false;
            const isRovoDevEnabled = true;

            await analyticsApi.fireLaunchedEvent(
                location,
                ideUriScheme,
                numJiraCloudAuthed,
                numJiraDcAuthed,
                numBitbucketCloudAuthed,
                numBitbucketDcAuthed,
                isJiraEnabled,
                isBitbucketEnabled,
                isRovoDevEnabled,
            );

            expect(analytics.launchedEvent).toHaveBeenCalledWith(
                location,
                ideUriScheme,
                numJiraCloudAuthed,
                numJiraDcAuthed,
                numBitbucketCloudAuthed,
                numBitbucketDcAuthed,
                isJiraEnabled,
                isBitbucketEnabled,
                isRovoDevEnabled,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire feature change event', async () => {
            const featureId = 'test-feature';
            const enabled = true;
            await analyticsApi.fireFeatureChangeEvent(featureId, enabled);

            expect(analytics.featureChangeEvent).toHaveBeenCalledWith(featureId, enabled);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire authenticated event', async () => {
            const isOnboarding = true;
            await analyticsApi.fireAuthenticatedEvent(mockSite, isOnboarding);

            expect(analytics.authenticatedEvent).toHaveBeenCalledWith(mockSite, isOnboarding);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire logged out event', async () => {
            await analyticsApi.fireLoggedOutEvent(mockSite);

            expect(analytics.loggedOutEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue created event', async () => {
            const issueKey = 'TEST-123';
            await analyticsApi.fireIssueCreatedEvent(mockSite, issueKey);

            expect(analytics.issueCreatedEvent).toHaveBeenCalledWith(mockSite, issueKey);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue transitioned event', async () => {
            const issueKey = 'TEST-123';
            await analyticsApi.fireIssueTransitionedEvent(mockSite, issueKey);

            expect(analytics.issueTransitionedEvent).toHaveBeenCalledWith(mockSite, issueKey);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue URL copied event', async () => {
            await analyticsApi.fireIssueUrlCopiedEvent();

            expect(analytics.issueUrlCopiedEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR created event', async () => {
            await analyticsApi.firePrCreatedEvent(mockSite, { isDraft: false });

            expect(analytics.prCreatedEvent).toHaveBeenCalledWith(mockSite, {
                hostProduct: 'Jira',
                instanceType: 'cloud',
                isDraft: false,
            });
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR comment event', async () => {
            await analyticsApi.firePrCommentEvent(mockSite);

            expect(analytics.prCommentEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR task event with comment id', async () => {
            const commentId = 'comment-123';
            await analyticsApi.firePrTaskEvent(mockSite, commentId);

            expect(analytics.prTaskEvent).toHaveBeenCalledWith(mockSite, 'comment');
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR task event without comment id', async () => {
            await analyticsApi.firePrTaskEvent(mockSite);

            expect(analytics.prTaskEvent).toHaveBeenCalledWith(mockSite, 'prlevel');
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR checkout event', async () => {
            await analyticsApi.firePrCheckoutEvent(mockSite);

            expect(analytics.prCheckoutEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR approve event', async () => {
            await analyticsApi.firePrApproveEvent(mockSite);

            expect(analytics.prApproveEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR merge event', async () => {
            await analyticsApi.firePrMergeEvent(mockSite);

            expect(analytics.prMergeEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PR URL copied event', async () => {
            await analyticsApi.firePrUrlCopiedEvent();

            expect(analytics.prUrlCopiedEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire custom JQL created event', async () => {
            await analyticsApi.fireCustomJQLCreatedEvent(mockSite);

            expect(analytics.customJQLCreatedEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire pipeline start event', async () => {
            await analyticsApi.firePipelineStartEvent(mockSite);

            expect(analytics.pipelineStartEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire deep link event', async () => {
            const source = 'test-source';
            const target = 'test-target';
            const errorType = 'None' as any; // Using string as DeepLinkEventErrorType is only a type

            await analyticsApi.fireDeepLinkEvent(source, target, errorType);

            expect(analytics.deepLinkEvent).toHaveBeenCalledWith(source, target, errorType);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire pipeline rerun event', async () => {
            const source = 'test-source';
            await analyticsApi.firePipelineRerunEvent(mockSite, source);

            expect(analytics.pipelineRerunEvent).toHaveBeenCalledWith(mockSite, source);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire UI error event', async () => {
            const errorInfo: UIErrorInfo = {
                view: 'test-view',
                stack: 'Error stack trace',
                errorName: 'TestError',
                errorMessage: 'Test error message',
                errorCause: 'Test error cause',
                userDomain: 'unknown',
            };

            await analyticsApi.fireUIErrorEvent(errorInfo);

            expect(analytics.uiErrorEvent).toHaveBeenCalledWith(errorInfo);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue comment event', async () => {
            await analyticsApi.fireIssueCommentEvent(mockSite);

            expect(analytics.issueCommentEvent).toHaveBeenCalledWith(mockSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue work started event', async () => {
            const pushBranchToRemoteChecked = true;
            await analyticsApi.fireIssueWorkStartedEvent(mockSite, pushBranchToRemoteChecked);

            expect(analytics.issueWorkStartedEvent).toHaveBeenCalledWith(mockSite, pushBranchToRemoteChecked);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire issue updated event', async () => {
            const issueKey = 'TEST-123';
            const fieldName = 'Status';
            const fieldKey = 'status';

            await analyticsApi.fireIssueUpdatedEvent(mockSite, issueKey, fieldName, fieldKey);

            expect(analytics.issueUpdatedEvent).toHaveBeenCalledWith(mockSite, issueKey, fieldName, fieldKey);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire start issue creation event', async () => {
            const source = 'contextMenu';
            const product: Product = { key: 'jira', name: 'Jira' };

            await analyticsApi.fireStartIssueCreationEvent(source, product);

            expect(analytics.startIssueCreationEvent).toHaveBeenCalledWith(source, product);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PMF submitted event', async () => {
            const level = 'very_satisfied';
            await analyticsApi.firePmfSubmitted(level);

            expect(analytics.pmfSubmitted).toHaveBeenCalledWith(level);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PMF snoozed event', async () => {
            await analyticsApi.firePmfSnoozed();

            expect(analytics.pmfSnoozed).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire PMF closed event', async () => {
            await analyticsApi.firePmfClosed();

            expect(analytics.pmfClosed).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });

        it('should fire external link event', async () => {
            const source = 'test-source';
            const linkId = 'test-link-id';

            await analyticsApi.fireExternalLinkEvent(source, linkId);

            expect(analytics.externalLinkEvent).toHaveBeenCalledWith(source, linkId);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();
        });
    });

    describe('screen events', () => {
        it('should fire view screen event', async () => {
            const screenName = 'test-screen';
            await analyticsApi.fireViewScreenEvent(screenName);

            expect(analytics.viewScreenEvent).toHaveBeenCalledWith(screenName, undefined, undefined);
            expect(mockAnalyticsClient.sendScreenEvent).toHaveBeenCalled();
        });

        it('should fire view screen event with site and product', async () => {
            const screenName = 'test-screen';
            const product: Product = { key: 'bitbucket', name: 'Bitbucket' };

            await analyticsApi.fireViewScreenEvent(screenName, mockSite, product);

            expect(analytics.viewScreenEvent).toHaveBeenCalledWith(screenName, mockSite, product);
            expect(mockAnalyticsClient.sendScreenEvent).toHaveBeenCalled();
        });
    });

    describe('UI events', () => {
        it('should fire BB issues pagination event', async () => {
            await analyticsApi.fireBBIssuesPaginationEvent();

            expect(analytics.bbIssuesPaginationEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire PR pagination event', async () => {
            await analyticsApi.firePrPaginationEvent();

            expect(analytics.prPaginationEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire more settings button event', async () => {
            const source = 'test-source';
            await analyticsApi.fireMoreSettingsButtonEvent(source);

            expect(analytics.moreSettingsButtonEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire done button event', async () => {
            const source = 'test-source';
            await analyticsApi.fireDoneButtonEvent(source);

            expect(analytics.doneButtonEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire focus create issue event', async () => {
            const source = 'test-source';
            await analyticsApi.fireFocusCreateIssueEvent(source);

            expect(analytics.focusCreateIssueEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire focus issue event', async () => {
            const source = 'test-source';
            await analyticsApi.fireFocusIssueEvent(source);

            expect(analytics.focusIssueEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire focus create pull request event', async () => {
            const source = 'test-source';
            await analyticsApi.fireFocusCreatePullRequestEvent(source);

            expect(analytics.focusCreatePullRequestEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire focus pull request event', async () => {
            const source = 'test-source';
            await analyticsApi.fireFocusPullRequestEvent(source);

            expect(analytics.focusPullRequestEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire authenticate button event', async () => {
            const source = 'test-source';
            const isCloud = true;
            const siteInfo: SiteInfo = {
                host: 'test-host',
                product: { key: 'jira', name: 'Jira' },
            };

            await analyticsApi.fireAuthenticateButtonEvent(source, siteInfo, isCloud);

            expect(analytics.authenticateButtonEvent).toHaveBeenCalledWith(source, siteInfo, isCloud, false, false);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire logout button event', async () => {
            const source = 'test-source';
            await analyticsApi.fireLogoutButtonEvent(source);

            expect(analytics.logoutButtonEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire save manual code event', async () => {
            const source = 'test-source';
            await analyticsApi.fireSaveManualCodeEvent(source);

            expect(analytics.saveManualCodeEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });

        it('should fire open settings button event', async () => {
            const source = 'test-source';
            await analyticsApi.fireOpenSettingsButtonEvent(source);

            expect(analytics.openSettingsButtonEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });
        it('should fire explore features button event', async () => {
            const source = 'test-source';
            await analyticsApi.fireExploreFeaturesButtonEvent(source);

            expect(analytics.exploreFeaturesButtonEvent).toHaveBeenCalledWith(source);
            expect(mockAnalyticsClient.sendUIEvent).toHaveBeenCalled();
        });
    });

    describe('constructor behavior', () => {
        it('should initialize with isRemote and isWebUI flags', () => {
            const api = new VSCAnalyticsApi(mockAnalyticsClient, true, true);

            expect(api).toBeDefined();
            // Testing the private fields indirectly through the authenticateButtonEvent

            const source = 'test-source';
            const isCloud = true;
            const siteInfo: SiteInfo = {
                host: 'test-host',
                product: { key: 'jira', name: 'Jira' },
            };

            api.fireAuthenticateButtonEvent(source, siteInfo, isCloud);

            expect(analytics.authenticateButtonEvent).toHaveBeenCalledWith(source, siteInfo, isCloud, true, true);
        });
    });
});
