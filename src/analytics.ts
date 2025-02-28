import { ScreenEvent, TrackEvent, UIEvent } from './analytics-node-client/src/types';
import { DetailedSiteInfo, isEmptySiteInfo, Product, ProductJira, SiteInfo } from './atlclients/authInfo';
import { BitbucketIssuesTreeViewId, PullRequestTreeViewId } from './constants';
import { Container } from './container';
import { UIErrorInfo } from './analyticsTypes';

// IMPORTANT
// Make sure there is a corresponding event with the correct attributes in the Data Portal for any event created here.
// 1. Go to go/dataportal
// 2. Open the Measure menu (on top) -> Event Registry
// 3. Add or update the new/changed event

export const Registry = {
    screen: {
        pullRequestDiffScreen: 'pullRequestDiffScreen',
        pullRequestPreviewDiffScreen: 'pullRequestPreviewDiffScreen',
    },
};

class AnalyticsPlatform {
    private static nodeJsPlatformMapping: Record<NodeJS.Platform, string> = {
        aix: 'desktop',
        android: 'android',
        darwin: 'mac',
        freebsd: 'desktop',
        linux: 'linux',
        openbsd: 'desktop',
        sunos: 'desktop',
        win32: 'windows',
        cygwin: 'windows',
        haiku: 'unknown',
        netbsd: 'unknown',
    };

    static for(p: NodeJS.Platform): string {
        return this.nodeJsPlatformMapping[p] || 'unknown';
    }
}

// Extension lifecycle events

export async function installedEvent(version: string): Promise<TrackEvent> {
    return trackEvent('installed', 'atlascode', { attributes: { machineId: Container.machineId, version: version } });
}

export async function upgradedEvent(version: string, previousVersion: string): Promise<TrackEvent> {
    return trackEvent('upgraded', 'atlascode', {
        attributes: { machineId: Container.machineId, version: version, previousVersion: previousVersion },
    });
}

export async function launchedEvent(location: string): Promise<TrackEvent> {
    return trackEvent('launched', 'atlascode', {
        attributes: { machineId: Container.machineId, extensionLocation: location },
    });
}

export async function featureChangeEvent(featureId: string, enabled: boolean): Promise<TrackEvent> {
    const action = enabled ? 'enabled' : 'disabled';
    return trackEvent(action, 'feature', { actionSubjectId: featureId });
}

export async function authenticatedEvent(site: DetailedSiteInfo, isOnboarding?: boolean): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'authenticated', 'atlascode', {
        attributes: { machineId: Container.machineId, hostProduct: site.product.name, onboarding: isOnboarding },
    });
}

export async function editedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'edited', 'atlascode', {
        attributes: { machineId: Container.machineId, hostProduct: site.product.name },
    });
}

export async function loggedOutEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'unauthenticated', 'atlascode', {
        attributes: { machineId: Container.machineId, hostProduct: site.product.name },
    });
}

// Feature Flag Events

export async function featureFlagClientInitializedEvent(): Promise<TrackEvent> {
    return trackEvent('initialized', 'featureFlagClient');
}

export async function featureFlagClientInitializationFailedEvent(): Promise<TrackEvent> {
    return trackEvent('initializationFailed', 'featureFlagClient');
}

// Jira issue events

export async function issueCreatedEvent(site: DetailedSiteInfo, issueKey: string): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'issue', { actionSubjectId: issueKey });
}

export async function issueTransitionedEvent(site: DetailedSiteInfo, issueKey: string): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'transitioned', 'issue', { actionSubjectId: issueKey });
}

export async function issueUrlCopiedEvent(): Promise<TrackEvent> {
    return trackEvent('copied', 'issueUrl');
}

export async function issueCommentEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'issueComment');
}

export async function issueWorkStartedEvent(
    site: DetailedSiteInfo,
    pushBranchToRemoteChecked: boolean,
): Promise<TrackEvent> {
    const attributesObject = instanceType({}, site);
    attributesObject.attributes.pushBranchToRemoteChecked = pushBranchToRemoteChecked;
    return instanceTrackEvent(site, 'workStarted', 'issue', attributesObject);
}

export async function issueUpdatedEvent(
    site: DetailedSiteInfo,
    issueKey: string,
    fieldName: string,
    fieldKey: string,
): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'updated', 'issue', {
        actionSubjectId: issueKey,
        attributes: { fieldName: fieldName, fieldKey: fieldKey },
    });
}

export async function startIssueCreationEvent(source: string, product: Product): Promise<TrackEvent> {
    return trackEvent('createFromSource', 'issue', { attributes: { source: source, hostProduct: product.name } });
}

export async function searchIssuesEvent(product: Product): Promise<TrackEvent> {
    return trackEvent('searchIssues', 'issue', { attributes: { hostProduct: product.name } });
}

// Bitbucket issue events

export async function bbIssueCreatedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'bbIssue');
}

export async function bbIssueTransitionedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'transitioned', 'bbIssue');
}

export async function bbIssueUrlCopiedEvent(): Promise<TrackEvent> {
    return trackEvent('copied', 'bbIssueUrl');
}

export async function bbIssueCommentEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'bbIssueComment');
}

export async function bbIssueWorkStartedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'workStarted', 'bbIssue');
}

// PR events

export async function prCreatedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'pullRequest');
}

export async function prCommentEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'pullRequestComment');
}

export async function prTaskEvent(site: DetailedSiteInfo, source: string): Promise<TrackEvent> {
    const attributesObject = instanceType({}, site);
    attributesObject.attributes.source = source;
    return trackEvent('created', 'pullRequestComment', attributesObject);
}

export async function prCheckoutEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'checkedOut', 'pullRequestBranch');
}

export async function fileCheckoutEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'fileCheckedOut', 'pullRequestBranch');
}

export async function prApproveEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'approved', 'pullRequest');
}

export async function prMergeEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'merged', 'pullRequest');
}

export async function prUrlCopiedEvent(): Promise<TrackEvent> {
    return trackEvent('copied', 'pullRequestUrl');
}

// Misc Track Events

export async function customJQLCreatedEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'created', 'customJql');
}

export async function pipelineStartEvent(site: DetailedSiteInfo): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'start', 'pipeline');
}

export async function pipelineRerunEvent(site: DetailedSiteInfo, source: string): Promise<TrackEvent> {
    return instanceTrackEvent(site, 'rerun', 'pipeline', { attributes: { source: source } });
}

export async function pmfSubmitted(level: string): Promise<TrackEvent> {
    return trackEvent('submitted', 'atlascodePmf', { attributes: { level: level } });
}

export async function pmfSnoozed(): Promise<TrackEvent> {
    return trackEvent('snoozed', 'atlascodePmf');
}

export async function pmfClosed(): Promise<TrackEvent> {
    return trackEvent('closed', 'atlascodePmf');
}

export async function deepLinkEvent(source: string, target: string): Promise<TrackEvent> {
    return trackEvent('opened', 'deepLink', { attributes: { source: source, target: target } });
}

export async function externalLinkEvent(source: string, linkId: string): Promise<TrackEvent> {
    return trackEvent('opened', 'externalLink', { attributes: { source: source, linkType: linkId } });
}

// Screen Events

export async function viewScreenEvent(
    screenName: string,
    site?: DetailedSiteInfo,
    product?: Product,
): Promise<ScreenEvent> {
    let screenEvent = instanceType(
        {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
        },
        site,
        product,
    );

    if (screenName === 'atlascodeWelcomeScreen') {
        screenEvent = excludeFromActivity(screenEvent);
    }

    const e = {
        tenantIdType: null,
        name: screenName,
        screenEvent: screenEvent,
    };

    const tenantId: string | undefined = site ? site.id : undefined;

    return anyUserOrAnonymous<ScreenEvent>(tenantOrNull<ScreenEvent>(e, tenantId));
}

// UI Events

export async function uiErrorEvent(errorInfo: UIErrorInfo): Promise<TrackEvent> {
    const e = trackEvent('failedTest', 'ui', {
        attributes: { ...errorInfo },
    });
    return e;
}

export async function bbIssuesPaginationEvent(): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            source: 'vscode',
            containerType: 'treeview',
            containerId: BitbucketIssuesTreeViewId,
            objectType: 'treenode',
            objectId: 'paginationNode',
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function prPaginationEvent(): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            source: 'vscode',
            containerType: 'treeview',
            containerId: PullRequestTreeViewId,
            objectType: 'treenode',
            objectId: 'paginationNode',
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function moreSettingsButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'moreSettingsButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function focusCreateIssueEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'focusCreateIssue',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function focusIssueEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'focusIssue',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}
export async function focusCreatePullRequestEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'focusCreatePullRequest',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}
export async function focusPullRequestEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'focusPullRequest',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}
export async function doneButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'doneButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function authenticateButtonEvent(
    source: string,
    site: SiteInfo,
    isCloud: boolean,
    isRemote: boolean,
    isWebUI: boolean,
): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'authenticateButton',
            source: source,
            attributes: {
                instanceType: isCloud ? 'cloud' : 'server',
                hostProduct: site.product.name,
                isRemote: isRemote,
                isWebUI: isWebUI,
            },
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function editButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'editCredentialsButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function logoutButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'logoutButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function saveManualCodeEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'saveCodeButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function configureJQLButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'configureJQLButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function openSettingsButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'openSettingsButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function exploreFeaturesButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'exploreFeaturesButton',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function openWorkbenchRepositoryButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'openWorkbenchRepository',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function openWorkbenchWorkspaceButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'openWorkbenchWorkspace',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function cloneRepositoryButtonEvent(source: string): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'cloneRepository',
            source: source,
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

export async function openActiveIssueEvent(): Promise<UIEvent> {
    const e = {
        tenantIdType: null,
        uiEvent: {
            origin: 'desktop',
            platform: AnalyticsPlatform.for(process.platform),
            action: 'clicked',
            actionSubject: 'button',
            actionSubjectId: 'openActiveIssue',
            source: 'statusBar',
        },
    };

    return anyUserOrAnonymous<UIEvent>(e);
}

// Helper methods

async function instanceTrackEvent(
    site: DetailedSiteInfo,
    action: string,
    actionSubject: string,
    eventProps: any = {},
): Promise<TrackEvent> {
    const event: TrackEvent =
        site.isCloud && site.product.key === ProductJira.key
            ? await tenantTrackEvent(site.id, action, actionSubject, instanceType(eventProps, site))
            : await trackEvent(action, actionSubject, instanceType(eventProps, site));

    return event;
}

async function trackEvent(action: string, actionSubject: string, eventProps: any = {}): Promise<TrackEvent> {
    const e = {
        tenantIdType: null,
        trackEvent: event(action, actionSubject, eventProps),
    };

    return anyUserOrAnonymous<TrackEvent>(e);
}

async function tenantTrackEvent(
    tenentId: string,
    action: string,
    actionSubject: string,
    eventProps: any = {},
): Promise<TrackEvent> {
    const e = {
        tenantIdType: 'cloudId',
        tenantId: tenentId,
        trackEvent: event(action, actionSubject, eventProps),
    };

    return anyUserOrAnonymous<TrackEvent>(e);
}

function event(action: string, actionSubject: string, attributes: any): any {
    const event = {
        origin: 'desktop',
        platform: AnalyticsPlatform.for(process.platform),
        action: action,
        actionSubject: actionSubject,
        source: 'vscode',
    };
    return Object.assign(event, attributes);
}

function anyUserOrAnonymous<T>(e: Object): T {
    let newObj: Object;
    const aaid = Container.siteManager.getFirstAAID();

    if (aaid) {
        newObj = { ...e, ...{ userId: aaid, userIdType: 'atlassianAccount', anonymousId: Container.machineId } };
    } else {
        newObj = { ...e, ...{ anonymousId: Container.machineId } };
    }

    return newObj as T;
}

function tenantOrNull<T>(e: Object, tenantId?: string): T {
    let tenantType: string | null = 'cloudId';

    if (!tenantId) {
        tenantType = null;
    }

    const newObj: Object = { ...e, ...{ tenantIdType: tenantType, tenantId: tenantId } };
    return newObj as T;
}

function instanceType(
    eventProps: Record<string, any>,
    site?: DetailedSiteInfo,
    product?: Product,
): Record<string, any> {
    if (product) {
        eventProps.attributes = eventProps.attributes || {};
        eventProps.attributes.hostProduct = product.name;
    }

    if (site && !isEmptySiteInfo(site)) {
        eventProps.attributes = eventProps.attributes || {};
        eventProps.attributes.instanceType = site.isCloud ? 'cloud' : 'server';
        eventProps.attributes.hostProduct = site.product.name;
    }

    return eventProps;
}

function excludeFromActivity(eventProps: Record<string, any>): Record<string, any> {
    eventProps.attributes = eventProps.attributes || {};
    eventProps.attributes.excludeFromActivity = true;
    return eventProps;
}
