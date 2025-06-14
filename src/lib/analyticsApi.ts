import { DeepLinkEventErrorType } from '../analytics';
import { UIErrorInfo } from '../analyticsTypes';
import { DetailedSiteInfo, Product, SiteInfo } from '../atlclients/authInfo';

export interface AnalyticsApi {
    fireInstalledEvent(version: string): Promise<void>;
    fireUpgradedEvent(version: string, previousVersion: string): Promise<void>;
    fireLaunchedEvent(
        location: string,
        ideUriScheme: string,
        numJiraCloudAuthed: number,
        numJiraDcAuthed: number,
        numBitbucketCloudAuthed: number,
        numBitbucketDcAuthed: number,
    ): Promise<void>;
    fireFeatureChangeEvent(featureId: string, enabled: boolean): Promise<void>;
    fireAuthenticatedEvent(site: DetailedSiteInfo): Promise<void>;
    fireLoggedOutEvent(site: DetailedSiteInfo): Promise<void>;
    fireIssueCreatedEvent(site: DetailedSiteInfo, issueKey: string): Promise<void>;
    fireIssueTransitionedEvent(site: DetailedSiteInfo, issueKey: string): Promise<void>;
    fireIssueUrlCopiedEvent(): Promise<void>;
    fireIssueCommentEvent(site: DetailedSiteInfo): Promise<void>;
    fireIssueWorkStartedEvent(site: DetailedSiteInfo, pushBranchToRemoteChecked: boolean): Promise<void>;
    fireIssueUpdatedEvent(site: DetailedSiteInfo, issueKey: string, fieldName: string, fieldKey: string): Promise<void>;
    fireStartIssueCreationEvent(source: string, product: Product): Promise<void>;
    firePrCreatedEvent(site: DetailedSiteInfo): Promise<void>;
    firePrCommentEvent(site: DetailedSiteInfo): Promise<void>;
    firePrTaskEvent(site: DetailedSiteInfo, commentId?: string): Promise<void>;
    firePrCheckoutEvent(site: DetailedSiteInfo): Promise<void>;
    firePrApproveEvent(site: DetailedSiteInfo): Promise<void>;
    firePrMergeEvent(site: DetailedSiteInfo): Promise<void>;
    firePrUrlCopiedEvent(): Promise<void>;
    fireCustomJQLCreatedEvent(site: DetailedSiteInfo): Promise<void>;
    firePipelineStartEvent(site: DetailedSiteInfo): Promise<void>;
    firePmfSubmitted(level: string): Promise<void>;
    firePmfSnoozed(): Promise<void>;
    firePmfClosed(): Promise<void>;
    fireViewScreenEvent(screenName: string, site?: DetailedSiteInfo, product?: Product): Promise<void>;
    fireBBIssuesPaginationEvent(): Promise<void>;
    firePrPaginationEvent(): Promise<void>;
    fireMoreSettingsButtonEvent(source: string): Promise<void>;
    fireDoneButtonEvent(source: string): Promise<void>;
    fireFocusCreateIssueEvent(source: string): Promise<void>;
    fireFocusIssueEvent(source: string): Promise<void>;
    fireFocusCreatePullRequestEvent(source: string): Promise<void>;
    fireFocusPullRequestEvent(source: string): Promise<void>;
    fireAuthenticateButtonEvent(source: string, site: SiteInfo, isCloud: boolean): Promise<void>;
    fireLogoutButtonEvent(source: string): Promise<void>;
    fireSaveManualCodeEvent(source: string): Promise<void>;
    fireExternalLinkEvent(source: string, linkId: string): Promise<void>;
    fireDeepLinkEvent(source: string, target: string, success: DeepLinkEventErrorType): Promise<void>;
    fireOpenSettingsButtonEvent(source: string): Promise<void>;
    fireExploreFeaturesButtonEvent(source: string): Promise<void>;
    firePipelineRerunEvent(site: DetailedSiteInfo, source: string): Promise<void>;
    fireUIErrorEvent(errorInfo: UIErrorInfo): Promise<void>;
}
