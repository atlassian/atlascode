import * as analytics from './analytics';
import { ClientInitializedErrorType, DeepLinkEventErrorType } from './analytics';
import { UIErrorInfo } from './analyticsTypes';

interface MockedData {
    getFirstAAID_value?: string | undefined;
}

const mockedData: MockedData = {};

jest.mock('./container', () => ({
    Container: {
        siteManager: { getFirstAAID: () => mockedData.getFirstAAID_value },
        machineId: 'test-machine-id',
    },
}));

function setProcessPlatform(platform: NodeJS.Platform) {
    Object.defineProperty(process, 'platform', {
        value: platform,
        writable: false,
    });
}

describe('analytics', () => {
    describe('viewScreenEvent', () => {
        const originalPlatform = process.platform;

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        afterAll(() => {
            setProcessPlatform(originalPlatform);
        });

        it('should create a screen event with the correct screen name', async () => {
            const screenName = 'testScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.name).toEqual(screenName);
            expect(event.screenEvent.attributes).toBeUndefined();
        });

        it('should exclude from activity if screen name is atlascodeWelcomeScreen', async () => {
            const screenName = 'atlascodeWelcomeScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.screenEvent.attributes.excludeFromActivity).toBeTruthy();
        });

        it('should include site information if provided (cloud)', async () => {
            const screenName = 'testScreen';
            const site: any = {
                id: 'siteId',
                product: { name: 'Jira', key: 'jira' },
                isCloud: true,
            };
            const event = await analytics.viewScreenEvent(screenName, site);
            expect(event.screenEvent.attributes.instanceType).toEqual('cloud');
            expect(event.screenEvent.attributes.hostProduct).toEqual('Jira');
        });

        it('should include site information if provided (server)', async () => {
            const screenName = 'testScreen';
            const site: any = {
                id: 'siteId',
                product: { name: 'Jira', key: 'jira' },
                isCloud: false,
            };
            const event = await analytics.viewScreenEvent(screenName, site);
            expect(event.screenEvent.attributes.instanceType).toEqual('server');
            expect(event.screenEvent.attributes.hostProduct).toEqual('Jira');
        });

        it('should include product information if provided', async () => {
            const screenName = 'testScreen';
            const product = { name: 'Bitbucket', key: 'bitbucket' };
            const event = await analytics.viewScreenEvent(screenName, undefined, product);
            expect(event.screenEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should set platform based on process.platform (win32)', async () => {
            setProcessPlatform('win32');
            const screenName = 'testScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.screenEvent.platform).toEqual('windows');
        });

        it('should set platform based on process.platform (darwin)', async () => {
            setProcessPlatform('darwin');
            const screenName = 'testScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.screenEvent.platform).toEqual('mac');
        });

        it('should set platform based on process.platform (linux)', async () => {
            setProcessPlatform('linux');
            const screenName = 'testScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.screenEvent.platform).toEqual('linux');
        });

        it('should set platform based on process.platform (aix)', async () => {
            setProcessPlatform('aix');
            const screenName = 'testScreen';
            const event = await analytics.viewScreenEvent(screenName);
            expect(event.screenEvent.platform).toEqual('desktop');
        });
    });

    // Extension lifecycle event tests
    describe('Extension lifecycle events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create installedEvent with version information', async () => {
            const version = '1.0.0';
            const event = await analytics.installedEvent(version);

            expect(event.trackEvent.action).toEqual('installed');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.version).toEqual(version);
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
        });

        it('should create upgradedEvent with version information', async () => {
            const version = '1.0.1';
            const previousVersion = '1.0.0';
            const event = await analytics.upgradedEvent(version, previousVersion);

            expect(event.trackEvent.action).toEqual('upgraded');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.version).toEqual(version);
            expect(event.trackEvent.attributes.previousVersion).toEqual(previousVersion);
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
        });

        it('should create launchedEvent with authentication counts', async () => {
            const location = 'test-location';
            const ideUriScheme = 'vscode';
            const numJiraCloudAuthed = 1;
            const numJiraDcAuthed = 2;
            const numBitbucketCloudAuthed = 3;
            const numBitbucketDcAuthed = 4;

            const event = await analytics.launchedEvent(
                location,
                ideUriScheme,
                numJiraCloudAuthed,
                numJiraDcAuthed,
                numBitbucketCloudAuthed,
                numBitbucketDcAuthed,
            );

            expect(event.trackEvent.action).toEqual('launched');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.extensionLocation).toEqual(location);
            expect(event.trackEvent.attributes.numJiraCloudAuthed).toEqual(numJiraCloudAuthed);
            expect(event.trackEvent.attributes.numJiraDcAuthed).toEqual(numJiraDcAuthed);
            expect(event.trackEvent.attributes.numBitbucketCloudAuthed).toEqual(numBitbucketCloudAuthed);
            expect(event.trackEvent.attributes.numBitbucketDcAuthed).toEqual(numBitbucketDcAuthed);
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
        });

        it('should create featureChangeEvent when feature is enabled', async () => {
            const featureId = 'test-feature';
            const enabled = true;
            const event = await analytics.featureChangeEvent(featureId, enabled);

            expect(event.trackEvent.action).toEqual('enabled');
            expect(event.trackEvent.actionSubject).toEqual('feature');
            expect(event.trackEvent.actionSubjectId).toEqual(featureId);
        });

        it('should create featureChangeEvent when feature is disabled', async () => {
            const featureId = 'test-feature';
            const enabled = false;
            const event = await analytics.featureChangeEvent(featureId, enabled);

            expect(event.trackEvent.action).toEqual('disabled');
            expect(event.trackEvent.actionSubject).toEqual('feature');
            expect(event.trackEvent.actionSubjectId).toEqual(featureId);
        });
    });

    // Authentication event tests
    describe('Authentication events', () => {
        const mockSite = {
            id: 'site-id',
            product: { name: 'Jira', key: 'jira' },
            isCloud: true,
        };

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create authenticatedEvent with site information', async () => {
            const isOnboarding = true;
            const event = await analytics.authenticatedEvent(mockSite as any, isOnboarding);

            expect(event.trackEvent.action).toEqual('authenticated');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Jira');
            expect(event.trackEvent.attributes.onboarding).toEqual(isOnboarding);
        });

        it('should create editedEvent with site information', async () => {
            const event = await analytics.editedEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('edited');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Jira');
        });

        it('should create loggedOutEvent with site information', async () => {
            const event = await analytics.loggedOutEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('unauthenticated');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.machineId).toEqual('test-machine-id');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Jira');
        });
    });

    // Error reporting tests
    describe('Error events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create errorEvent with error information', async () => {
            const errorMessage = 'Test error message';
            const error = new Error('Test error');
            error.stack = 'Error: Test error\n    at TestFunction (/Users/testuser/test.js:10:15)';
            const capturedBy = 'test-function';
            const additionalParams = 'additional-info';

            const event = await analytics.errorEvent(errorMessage, error, capturedBy, additionalParams);

            expect(event.trackEvent.action).toEqual('errorEvent_v2');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.message).toEqual(errorMessage);
            expect(event.trackEvent.attributes.name).toEqual('Error');
            expect(event.trackEvent.attributes.capturedBy).toEqual(capturedBy);
            expect(event.trackEvent.attributes.stack).toBeDefined();
            expect(event.trackEvent.attributes.additionalParams).toEqual(additionalParams);
        });

        it('should sanitize stack traces in errorEvent', async () => {
            const errorMessage = 'Test error message';
            const error = new Error('Test error');
            error.stack = 'Error: Test error\n    at TestFunction (/Users/realuser/test.js:10:15)';

            const event = await analytics.errorEvent(errorMessage, error);

            // Check if the username was sanitized
            expect(event.trackEvent.attributes.stack).toContain('/Users/<user>/');
            expect(event.trackEvent.attributes.stack).not.toContain('/Users/realuser/');
        });

        it('should create uiErrorEvent with UI error information', async () => {
            const errorInfo: UIErrorInfo = {
                view: 'test-view',
                stack: 'Error stack',
                errorName: 'TestError',
                errorMessage: 'Test UI error',
                errorCause: 'Test cause',
            };

            const event = await analytics.uiErrorEvent(errorInfo);

            expect(event.trackEvent.action).toEqual('failedTest');
            expect(event.trackEvent.actionSubject).toEqual('ui');
            expect(event.trackEvent.attributes).toEqual(errorInfo);
        });
    });

    // Jira issue event tests
    describe('Issue events', () => {
        const mockSite = {
            id: 'site-id',
            product: { name: 'Jira', key: 'jira' },
            isCloud: true,
        };

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create issueCreatedEvent with issue key', async () => {
            const issueKey = 'TEST-123';
            const event = await analytics.issueCreatedEvent(mockSite as any, issueKey);

            expect(event.trackEvent.action).toEqual('created');
            expect(event.trackEvent.actionSubject).toEqual('issue');
            expect(event.trackEvent.actionSubjectId).toEqual(issueKey);
        });

        it('should create issueTransitionedEvent with issue key', async () => {
            const issueKey = 'TEST-123';
            const event = await analytics.issueTransitionedEvent(mockSite as any, issueKey);

            expect(event.trackEvent.action).toEqual('transitioned');
            expect(event.trackEvent.actionSubject).toEqual('issue');
            expect(event.trackEvent.actionSubjectId).toEqual(issueKey);
        });

        it('should create issueUrlCopiedEvent', async () => {
            const event = await analytics.issueUrlCopiedEvent();

            expect(event.trackEvent.action).toEqual('copied');
            expect(event.trackEvent.actionSubject).toEqual('issueUrl');
        });
    });

    // Pull request event tests
    describe('Pull request events', () => {
        const mockSite = {
            id: 'site-id',
            product: { name: 'Bitbucket', key: 'bitbucket' },
            isCloud: true,
        };

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create prCreatedEvent with site information', async () => {
            const event = await analytics.prCreatedEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('created');
            expect(event.trackEvent.actionSubject).toEqual('pullRequest');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create prCommentEvent with site information', async () => {
            const event = await analytics.prCommentEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('created');
            expect(event.trackEvent.actionSubject).toEqual('pullRequestComment');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create prUrlCopiedEvent', async () => {
            const event = await analytics.prUrlCopiedEvent();

            expect(event.trackEvent.action).toEqual('copied');
            expect(event.trackEvent.actionSubject).toEqual('pullRequestUrl');
        });
    });

    // PMF event tests
    describe('PMF events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create pmfSubmitted event with level information', async () => {
            const level = 'promoter';
            const event = await analytics.pmfSubmitted(level);

            expect(event.trackEvent.action).toEqual('submitted');
            expect(event.trackEvent.actionSubject).toEqual('atlascodePmf');
            expect(event.trackEvent.attributes.level).toEqual(level);
        });

        it('should create pmfSnoozed event', async () => {
            const event = await analytics.pmfSnoozed();

            expect(event.trackEvent.action).toEqual('snoozed');
            expect(event.trackEvent.actionSubject).toEqual('atlascodePmf');
        });

        it('should create pmfClosed event', async () => {
            const event = await analytics.pmfClosed();

            expect(event.trackEvent.action).toEqual('closed');
            expect(event.trackEvent.actionSubject).toEqual('atlascodePmf');
        });
    });

    // Deep link and external link event tests
    describe('Link events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create deepLinkEvent with source, target, and error type', async () => {
            const source = 'test-source';
            const target = 'test-target';
            const errorType: DeepLinkEventErrorType = 'Success';

            const event = await analytics.deepLinkEvent(source, target, errorType);

            expect(event.trackEvent.action).toEqual('opened');
            expect(event.trackEvent.actionSubject).toEqual('deepLink');
            expect(event.trackEvent.attributes.source).toEqual(source);
            expect(event.trackEvent.attributes.target).toEqual(target);
            expect(event.trackEvent.attributes.errorType).toEqual(errorType);
        });

        it('should create externalLinkEvent with source and link ID', async () => {
            const source = 'test-source';
            const linkId = 'test-link-id';

            const event = await analytics.externalLinkEvent(source, linkId);

            expect(event.trackEvent.action).toEqual('opened');
            expect(event.trackEvent.actionSubject).toEqual('externalLink');
            expect(event.trackEvent.attributes.source).toEqual(source);
            expect(event.trackEvent.attributes.linkType).toEqual(linkId);
        });
    });

    // UI Button event tests
    describe('UI Button events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create moreSettingsButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.moreSettingsButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('moreSettingsButton');
            expect(event.uiEvent.source).toEqual(source);
            expect(event.uiEvent.platform).toEqual('windows');
        });

        it('should create focusCreateIssueEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.focusCreateIssueEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('focusCreateIssue');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create focusIssueEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.focusIssueEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('focusIssue');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create focusCreatePullRequestEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.focusCreatePullRequestEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('focusCreatePullRequest');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create focusPullRequestEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.focusPullRequestEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('focusPullRequest');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create doneButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.doneButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('doneButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create authenticateButtonEvent with all parameters', async () => {
            const source = 'test-source';
            const site = {
                product: { name: 'Jira', key: 'jira' },
            };
            const isCloud = true;
            const isRemote = true;
            const isWebUI = false;

            const event = await analytics.authenticateButtonEvent(source, site as any, isCloud, isRemote, isWebUI);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('authenticateButton');
            expect(event.uiEvent.source).toEqual(source);
            expect(event.uiEvent.attributes.instanceType).toEqual('cloud');
            expect(event.uiEvent.attributes.hostProduct).toEqual('Jira');
            expect(event.uiEvent.attributes.isRemote).toEqual(isRemote);
            expect(event.uiEvent.attributes.isWebUI).toEqual(isWebUI);
        });

        it('should create editButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.editButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('editCredentialsButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create logoutButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.logoutButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('logoutButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create saveManualCodeEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.saveManualCodeEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('saveCodeButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create configureJQLButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.configureJQLButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('configureJQLButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create openSettingsButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.openSettingsButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('openSettingsButton');
            expect(event.uiEvent.source).toEqual(source);
        });

        it('should create exploreFeaturesButtonEvent with source', async () => {
            const source = 'test-source';
            const event = await analytics.exploreFeaturesButtonEvent(source);

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.actionSubjectId).toEqual('exploreFeaturesButton');
            expect(event.uiEvent.source).toEqual(source);
        });
    });

    // Pagination event tests
    describe('Pagination events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create bbIssuesPaginationEvent for Bitbucket issues pagination', async () => {
            const event = await analytics.bbIssuesPaginationEvent();

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.containerType).toEqual('treeview');
            expect(event.uiEvent.objectType).toEqual('treenode');
            expect(event.uiEvent.objectId).toEqual('paginationNode');
        });

        it('should create prPaginationEvent for PR pagination', async () => {
            const event = await analytics.prPaginationEvent();

            expect(event.uiEvent.action).toEqual('clicked');
            expect(event.uiEvent.actionSubject).toEqual('button');
            expect(event.uiEvent.containerType).toEqual('treeview');
            expect(event.uiEvent.objectType).toEqual('treenode');
            expect(event.uiEvent.objectId).toEqual('paginationNode');
        });
    });

    // Other PR-related event tests
    describe('Additional PR events', () => {
        const mockSite = {
            id: 'site-id',
            product: { name: 'Bitbucket', key: 'bitbucket' },
            isCloud: true,
        };

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create prTaskEvent with site and source', async () => {
            const source = 'prlevel';
            const event = await analytics.prTaskEvent(mockSite as any, source);

            expect(event.trackEvent.action).toEqual('created');
            expect(event.trackEvent.actionSubject).toEqual('pullRequestComment');
            expect(event.trackEvent.attributes.source).toEqual(source);
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create prCheckoutEvent with site', async () => {
            const event = await analytics.prCheckoutEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('checkedOut');
            expect(event.trackEvent.actionSubject).toEqual('pullRequestBranch');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create fileCheckoutEvent with site', async () => {
            const event = await analytics.fileCheckoutEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('fileCheckedOut');
            expect(event.trackEvent.actionSubject).toEqual('pullRequestBranch');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create prApproveEvent with site', async () => {
            const event = await analytics.prApproveEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('approved');
            expect(event.trackEvent.actionSubject).toEqual('pullRequest');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create prMergeEvent with site', async () => {
            const event = await analytics.prMergeEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('merged');
            expect(event.trackEvent.actionSubject).toEqual('pullRequest');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });
    });

    // Pipeline event tests
    describe('Pipeline events', () => {
        const mockSite = {
            id: 'site-id',
            product: { name: 'Bitbucket', key: 'bitbucket' },
            isCloud: true,
        };

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create pipelineStartEvent with site', async () => {
            const event = await analytics.pipelineStartEvent(mockSite as any);

            expect(event.trackEvent.action).toEqual('start');
            expect(event.trackEvent.actionSubject).toEqual('pipeline');
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });

        it('should create pipelineRerunEvent with site and source', async () => {
            const source = 'test-source';
            const event = await analytics.pipelineRerunEvent(mockSite as any, source);

            expect(event.trackEvent.action).toEqual('rerun');
            expect(event.trackEvent.actionSubject).toEqual('pipeline');
            expect(event.trackEvent.attributes.source).toEqual(source);
            expect(event.trackEvent.attributes.instanceType).toEqual('cloud');
            expect(event.trackEvent.attributes.hostProduct).toEqual('Bitbucket');
        });
    });

    // Feature Flag event tests
    describe('Feature Flag events', () => {
        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create featureFlagClientInitializedEvent when successful', async () => {
            const event = await analytics.featureFlagClientInitializedEvent(true);

            expect(event.trackEvent.action).toEqual('initialized');
            expect(event.trackEvent.actionSubject).toEqual('featureFlagClient');
            expect(event.trackEvent.attributes.success).toEqual(true);
            expect(event.trackEvent.attributes.errorType).toEqual(0);
            expect(event.trackEvent.attributes.reason).toBeUndefined();
        });

        it('should create featureFlagClientInitializedEvent when failed', async () => {
            const errorType = ClientInitializedErrorType.Failed;
            const reason = 'test-failure-reason';
            const event = await analytics.featureFlagClientInitializedEvent(false, errorType, reason);

            expect(event.trackEvent.action).toEqual('initialized');
            expect(event.trackEvent.actionSubject).toEqual('featureFlagClient');
            expect(event.trackEvent.attributes.success).toEqual(false);
            expect(event.trackEvent.attributes.errorType).toEqual(errorType);
            expect(event.trackEvent.attributes.reason).toEqual(reason);
        });
    });

    // Utility function tests
    describe('Analytics utility functions', () => {
        // We need to directly access the utility functions to test them
        // Since they are not exported, we'll test their behavior through the APIs that use them

        it('should sanitize IP addresses in error messages', async () => {
            const ipErrorMessage = 'connect error 192.168.1.1 failed';
            const event = await analytics.errorEvent(ipErrorMessage);

            expect(event.trackEvent.attributes.message).not.toContain('192.168.1.1');
            expect(event.trackEvent.attributes.message).toContain('<ip>');
        });

        it('should sanitize domain names in getaddrinfo errors', async () => {
            const domainErrorMessage = 'getaddrinfo ENOTFOUND example.com';
            const event = await analytics.errorEvent(domainErrorMessage);

            expect(event.trackEvent.attributes.message).not.toContain('example.com');
            expect(event.trackEvent.attributes.message).toContain('<domain>');
        });

        it('should handle null error messages', async () => {
            const event = await analytics.errorEvent(undefined as any);

            expect(event.trackEvent.attributes.message).toBeUndefined();
        });

        it('should handle anonymous user for analytics events when AAID is not available', async () => {
            mockedData.getFirstAAID_value = undefined;
            const event = await analytics.pmfClosed();

            expect(event.userId).toBeUndefined();
            expect(event.anonymousId).toEqual('test-machine-id');
        });

        it('should include user ID for analytics events when AAID is available', async () => {
            mockedData.getFirstAAID_value = 'test-user-id';
            const event = await analytics.pmfClosed();

            expect(event.userId).toEqual('test-user-id');
            expect(event.userIdType).toEqual('atlassianAccount');
            expect(event.anonymousId).toEqual('test-machine-id');
        });

        it('should respect tenant ID when provided', async () => {
            const mockSite = {
                id: 'tenant-id',
                product: { name: 'Jira', key: 'jira' },
                isCloud: true,
            };

            const event = await analytics.issueCreatedEvent(mockSite as any, 'TEST-123');

            expect(event.tenantId).toEqual('tenant-id');
            expect(event.tenantIdType).toEqual('cloudId');
        });

        it('should set tenant type to null when no tenant ID provided', async () => {
            const event = await analytics.issueUrlCopiedEvent();

            expect(event.tenantId).toBeUndefined();
            expect(event.tenantIdType).toBeNull();
        });
    });

    describe('performanceEvent', () => {
        const originalPlatform = process.platform;

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        afterAll(() => {
            setProcessPlatform(originalPlatform);
        });

        describe('rovodev.response.timeToFirstByte', () => {
            it('should create a performance event with correct tag and measure', async () => {
                const measure = 150;
                const params = { sessionId: 'test-session-123', promptId: 'test-prompt-123' };

                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', measure, params);

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToFirstByte');
                expect(event.trackEvent.attributes.measure).toEqual(measure);
                expect(event.trackEvent.attributes.sessionId).toEqual(params.sessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(params.promptId);
            });
        });

        describe('rovodev.response.timeToFirstMessage', () => {
            it('should create a performance event with correct tag and measure', async () => {
                const measure = 250;
                const params = { sessionId: 'session-456', promptId: 'prompt-456' };

                const event = await analytics.performanceEvent('rovodev.response.timeToFirstMessage', measure, params);

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToFirstMessage');
                expect(event.trackEvent.attributes.measure).toEqual(measure);
                expect(event.trackEvent.attributes.sessionId).toEqual(params.sessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(params.promptId);
            });
        });

        describe('rovodev.response.timeToTechPlan', () => {
            it('should create a performance event with correct tag and measure', async () => {
                const measure = 500;
                const params = { sessionId: 'session-789', promptId: 'prompt-789' };

                const event = await analytics.performanceEvent('rovodev.response.timeToTechPlan', measure, params);

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToTechPlan');
                expect(event.trackEvent.attributes.measure).toEqual(measure);
                expect(event.trackEvent.attributes.sessionId).toEqual(params.sessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(params.promptId);
            });
        });

        describe('rovodev.response.timeToLastMessage', () => {
            it('should create a performance event with correct tag and measure', async () => {
                const measure = 1000;
                const params = { sessionId: 'session-999', promptId: 'prompt-999' };

                const event = await analytics.performanceEvent('rovodev.response.timeToLastMessage', measure, params);

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToLastMessage');
                expect(event.trackEvent.attributes.measure).toEqual(measure);
                expect(event.trackEvent.attributes.sessionId).toEqual(params.sessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(params.promptId);
            });
        });

        describe('general performanceEvent behavior', () => {
            it('should include platform information based on process.platform', async () => {
                setProcessPlatform('darwin');
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.platform).toEqual('mac');
            });

            it('should include origin information', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.origin).toEqual('desktop');
            });

            it('should handle empty string parameters', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, {
                    sessionId: '',
                    promptId: '',
                });

                expect(event.trackEvent.attributes.sessionId).toEqual('');
                expect(event.trackEvent.attributes.promptId).toEqual('');
            });

            it('should handle additional parameters in params object', async () => {
                const params = {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                    additionalData: 'extra-info',
                    numericData: 42,
                };

                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, params);

                expect(event.trackEvent.attributes.sessionId).toEqual('test-session');
                expect(event.trackEvent.attributes.promptId).toEqual('test-prompt');
                expect(event.trackEvent.attributes.additionalData).toEqual('extra-info');
                expect(event.trackEvent.attributes.numericData).toEqual(42);
            });

            it('should work with generic string tag and Record params', async () => {
                const customTag = 'custom.performance.metric';
                const measure = 300;
                const params = {
                    customParam1: 'value1',
                    customParam2: 123,
                    customParam3: true,
                };

                // Use type assertion to test the generic overload
                const event = await analytics.performanceEvent(customTag as any, measure, params as any);

                expect(event.trackEvent.attributes.tag).toEqual(customTag);
                expect(event.trackEvent.attributes.measure).toEqual(measure);
                expect(event.trackEvent.attributes.customParam1).toEqual('value1');
                expect(event.trackEvent.attributes.customParam2).toEqual(123);
                expect(event.trackEvent.attributes.customParam3).toEqual(true);
            });

            it('should handle null params', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, null as any);

                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToFirstByte');
                expect(event.trackEvent.attributes.measure).toEqual(100);
                expect(event.trackEvent.attributes.sessionId).toBeUndefined();
                expect(event.trackEvent.attributes.promptId).toBeUndefined();
            });

            it('should handle undefined params', async () => {
                const event = await analytics.performanceEvent(
                    'rovodev.response.timeToFirstByte',
                    100,
                    undefined as any,
                );

                expect(event.trackEvent.attributes.tag).toEqual('rovodev.response.timeToFirstByte');
                expect(event.trackEvent.attributes.measure).toEqual(100);
                expect(event.trackEvent.attributes.sessionId).toBeUndefined();
                expect(event.trackEvent.attributes.promptId).toBeUndefined();
            });
        });

        describe('event structure validation', () => {
            it('should return a valid TrackEvent structure', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                // Validate TrackEvent structure
                expect(event).toHaveProperty('trackEvent');
                expect(event).toHaveProperty('userIdType');
                expect(event).toHaveProperty('userId');
                expect(event).toHaveProperty('tenantIdType');

                // Validate trackEvent structure
                expect(event.trackEvent).toHaveProperty('action');
                expect(event.trackEvent).toHaveProperty('actionSubject');
                expect(event.trackEvent).toHaveProperty('attributes');
                expect(event.trackEvent).toHaveProperty('platform');
                expect(event.trackEvent).toHaveProperty('origin');
            });

            it('should have consistent action and actionSubject for timeToFirstByte', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstByte', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
            });

            it('should have consistent action and actionSubject for timeToFirstMessage', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToFirstMessage', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
            });

            it('should have consistent action and actionSubject for timeToTechPlan', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToTechPlan', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
            });

            it('should have consistent action and actionSubject for timeToLastMessage', async () => {
                const event = await analytics.performanceEvent('rovodev.response.timeToLastMessage', 100, {
                    sessionId: 'test-session',
                    promptId: 'test-prompt',
                });

                expect(event.trackEvent.action).toEqual('performanceEvent');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
            });
        });
    });

    // Rovo Dev event tests
    describe('Rovo Dev events', () => {
        const mockSessionId = 'test-session-id';
        const mockPromptId = 'test-prompt-id';

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should create rovoDevPromptSentEvent with session and prompt IDs', async () => {
            const event = await analytics.rovoDevPromptSentEvent(mockSessionId, mockPromptId, 'chat', true);

            expect(event.trackEvent.action).toEqual('rovoDevPromptSent');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.source).toEqual('chat');
            expect(event.trackEvent.attributes.deepPlanEnabled).toEqual(true);
        });

        it('should create rovoDevNewSessionActionEvent with session information', async () => {
            const isManuallyCreated = true;
            const event = await analytics.rovoDevNewSessionActionEvent(mockSessionId, isManuallyCreated);

            expect(event.trackEvent.action).toEqual('rovoDevNewSessionAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.isManuallyCreated).toEqual(isManuallyCreated);
        });

        it('should create rovoDevTechnicalPlanningShownEvent with planning details', async () => {
            const stepsCount = 5;
            const filesCount = 3;
            const questionsCount = 2;
            const event = await analytics.rovoDevTechnicalPlanningShownEvent(
                mockSessionId,
                stepsCount,
                filesCount,
                questionsCount,
            );

            expect(event.trackEvent.action).toEqual('rovoDevTechnicalPlanningShown');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.stepsCount).toEqual(stepsCount);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
            expect(event.trackEvent.attributes.questionsCount).toEqual(questionsCount);
        });

        it('should create rovoDevFilesSummaryShownEvent for new files summary', async () => {
            const filesCount = 4;
            const event = await analytics.rovoDevFilesSummaryShownEvent(mockSessionId, filesCount);

            expect(event.trackEvent.action).toEqual('rovoDevFilesSummaryShown');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
        });

        it('should create rovoDevFileChangedActionEvent for undo action', async () => {
            const action = 'undo';
            const filesCount = 3;
            const event = await analytics.rovoDevFileChangedActionEvent(
                mockSessionId,
                mockPromptId,
                action,
                filesCount,
            );

            expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.action).toEqual(action);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
        });

        it('should create rovoDevFileChangedActionEvent for keep action', async () => {
            const action = 'keep';
            const filesCount = 2;
            const event = await analytics.rovoDevFileChangedActionEvent(
                mockSessionId,
                mockPromptId,
                action,
                filesCount,
            );

            expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.action).toEqual(action);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
        });

        it('should create rovoDevStopActionEvent when successful', async () => {
            const failed = false;
            const event = await analytics.rovoDevStopActionEvent(mockSessionId, mockPromptId, failed);

            expect(event.trackEvent.action).toEqual('rovoDevStopAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.failed).toEqual(failed);
        });

        it('should create rovoDevStopActionEvent when failed', async () => {
            const failed = true;
            const event = await analytics.rovoDevStopActionEvent(mockSessionId, mockPromptId, failed);

            expect(event.trackEvent.action).toEqual('rovoDevStopAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.failed).toEqual(failed);
        });

        it('should create rovoDevGitPushActionEvent when PR is created', async () => {
            const prCreated = true;
            const event = await analytics.rovoDevGitPushActionEvent(mockSessionId, prCreated);

            expect(event.trackEvent.action).toEqual('rovoDevGitPushAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.prCreated).toEqual(prCreated);
        });

        it('should create rovoDevGitPushActionEvent when PR is not created', async () => {
            const prCreated = false;
            const event = await analytics.rovoDevGitPushActionEvent(mockSessionId, prCreated);

            expect(event.trackEvent.action).toEqual('rovoDevGitPushAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.prCreated).toEqual(prCreated);
        });

        it('should create rovoDevDetailsExpandedEvent', async () => {
            const event = await analytics.rovoDevDetailsExpandedEvent(mockSessionId);

            expect(event.trackEvent.action).toEqual('rovoDevDetailsExpanded');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        });
    });

    // Platform detection tests
    describe('AnalyticsPlatform', () => {
        beforeEach(() => {
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it('should map different platforms correctly', async () => {
            // Test through events that use the platform mapping
            setProcessPlatform('win32');
            let event = await analytics.issueUrlCopiedEvent();
            expect(event.trackEvent.platform).toEqual('windows');

            setProcessPlatform('darwin');
            event = await analytics.issueUrlCopiedEvent();
            expect(event.trackEvent.platform).toEqual('mac');

            setProcessPlatform('linux');
            event = await analytics.issueUrlCopiedEvent();
            expect(event.trackEvent.platform).toEqual('linux');

            setProcessPlatform('aix');
            event = await analytics.issueUrlCopiedEvent();
            expect(event.trackEvent.platform).toEqual('desktop');

            // Test an unknown platform
            setProcessPlatform('haiku' as NodeJS.Platform);
            event = await analytics.issueUrlCopiedEvent();
            expect(event.trackEvent.platform).toEqual('unknown');
        });
    });
});
