import { env, ExtensionContext, UIKind, window, workspace } from 'vscode';

import { featureFlagClientInitializedEvent } from './analytics';
import { AnalyticsClient, analyticsClient } from './analytics-node-client/src/client.min.js';
import { ProductJira } from './atlclients/authInfo';
import { CredentialManager } from './atlclients/authStore';
import { ClientManager } from './atlclients/clientManager';
import { LoginManager } from './atlclients/loginManager';
import { BitbucketContext } from './bitbucket/bbContext';
import { BitbucketCheckoutHelper } from './bitbucket/checkoutHelper';
import { CheckoutHelper } from './bitbucket/interfaces';
import { PullRequest, WorkspaceRepo } from './bitbucket/model';
import { BitbucketCloudPullRequestLinkProvider } from './bitbucket/terminal-link/createPrLinkProvider';
import { openPullRequest } from './commands/bitbucket/pullRequest';
import { configuration, IConfig } from './config/configuration';
import { ATLASCODE_TEST_HOST, ATLASCODE_TEST_USER_EMAIL } from './constants';
import { PmfStats } from './feedback/pmfStats';
import { JQLManager } from './jira/jqlManager';
import { JiraProjectManager } from './jira/projectManager';
import { JiraSettingsManager } from './jira/settingsManager';
import { CancellationManager } from './lib/cancellation';
import { ConfigAction } from './lib/ipc/fromUI/config';
import { OnboardingAction } from './lib/ipc/fromUI/onboarding';
import { PipelineSummaryAction } from './lib/ipc/fromUI/pipelineSummary';
import { PullRequestDetailsAction } from './lib/ipc/fromUI/pullRequestDetails';
import { StartWorkAction } from './lib/ipc/fromUI/startWork';
import { ConfigTarget } from './lib/ipc/models/config';
import { SectionChangeMessage } from './lib/ipc/toUI/config';
import { StartWorkIssueMessage } from './lib/ipc/toUI/startWork';
import { CommonActionMessageHandler } from './lib/webview/controller/common/commonActionMessageHandler';
import { Logger } from './logger';
import { Pipeline } from './pipelines/model';
import { SiteManager } from './siteManager';
import { AtlascodeUriHandler, ONBOARDING_URL, SETTINGS_URL } from './uriHandler';
import { Experiments, FeatureFlagClient, FeatureFlagClientInitError, Features } from './util/featureFlags';
import { AuthStatusBar } from './views/authStatusBar';
import { HelpExplorer } from './views/HelpExplorer';
import { JiraActiveIssueStatusBar } from './views/jira/activeIssueStatusBar';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';
import { SearchJiraHelper } from './views/jira/searchJiraHelper';
import { CustomJQLViewProvider } from './views/jira/treeViews/customJqlViewProvider';
import { AssignedWorkItemsViewProvider } from './views/jira/treeViews/jiraAssignedWorkItemsViewProvider';
import { PipelinesExplorer } from './views/pipelines/PipelinesExplorer';
import { VSCAnalyticsApi } from './vscAnalyticsApi';
import { VSCCommonMessageHandler } from './webview/common/vscCommonMessageActionHandler';
import { VSCConfigActionApi } from './webview/config/vscConfigActionApi';
import { VSCConfigWebviewControllerFactory } from './webview/config/vscConfigWebviewControllerFactory';
import { ExplorerFocusManager } from './webview/ExplorerFocusManager';
import { MultiWebview } from './webview/multiViewFactory';
import { VSCOnboardingActionApi } from './webview/onboarding/vscOnboardingActionApi';
import { VSCOnboardingWebviewControllerFactory } from './webview/onboarding/vscOnboardingWebviewControllerFactory';
import { PipelineSummaryActionImplementation } from './webview/pipelines/pipelineSummaryActionImplementation';
import { PipelineSummaryWebviewControllerFactory } from './webview/pipelines/pipelineSummaryWebviewControllerFactory';
import { VSCCreatePullRequestActionApi } from './webview/pullrequest/vscCreatePullRequestActionImpl';
import { VSCCreatePullRequestWebviewControllerFactory } from './webview/pullrequest/vscCreatePullRequestWebviewControllerFactory';
import { VSCPullRequestDetailsActionApi } from './webview/pullrequest/vscPullRequestDetailsActionApi';
import { VSCPullRequestDetailsWebviewControllerFactory } from './webview/pullrequest/vscPullRequestDetailsWebviewControllerFactory';
import { SingleWebview } from './webview/singleViewFactory';
import { VSCStartWorkActionApi } from './webview/startwork/vscStartWorkActionApi';
import { VSCStartWorkWebviewControllerFactory } from './webview/startwork/vscStartWorkWebviewControllerFactory';
import { CreateIssueProblemsWebview } from './webviews/createIssueProblemsWebview';
import { CreateIssueWebview } from './webviews/createIssueWebview';
import { JiraIssueViewManager } from './webviews/jiraIssueViewManager';
import { StartWorkOnIssueWebview } from './webviews/startWorkOnIssueWebview';

const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;
const ConfigTargetKey = 'configurationTarget';

export class Container {
    private static _cancellationManager: CancellationManager;
    private static _commonMessageHandler: CommonActionMessageHandler;
    private static _bitbucketHelper: CheckoutHelper;
    private static _assignedWorkItemsView: AssignedWorkItemsViewProvider;

    static async initialize(context: ExtensionContext, config: IConfig, version: string) {
        const analyticsEnv: string = this.isDebugging ? 'staging' : 'prod';

        this._analyticsClient = analyticsClient({
            origin: 'desktop',
            env: analyticsEnv,
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: this.machineId,
            enable: this.getAnalyticsEnable(),
        });

        this._cancellationManager = new Map();
        this._analyticsApi = new VSCAnalyticsApi(this._analyticsClient, this.isRemote, this.isWebUI);
        this._commonMessageHandler = new VSCCommonMessageHandler(this._analyticsApi, this._cancellationManager);

        this._context = context;
        this._version = version;

        context.subscriptions.push((this._credentialManager = new CredentialManager(this._analyticsClient)));
        context.subscriptions.push((this._siteManager = new SiteManager(context.globalState)));
        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._jiraProjectManager = new JiraProjectManager()));
        context.subscriptions.push((this._jiraSettingsManager = new JiraSettingsManager()));
        context.subscriptions.push((this._createIssueWebview = new CreateIssueWebview(context.extensionPath)));
        context.subscriptions.push(
            (this._createIssueProblemsWebview = new CreateIssueProblemsWebview(context.extensionPath)),
        );
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
        context.subscriptions.push(new StartWorkOnIssueWebview(context.extensionPath));
        context.subscriptions.push(new IssueHoverProviderManager());
        context.subscriptions.push(new AuthStatusBar());
        context.subscriptions.push((this._jqlManager = new JQLManager()));
        context.subscriptions.push((this._explorerFocusManager = new ExplorerFocusManager()));

        const settingsV2ViewFactory = new SingleWebview<SectionChangeMessage, ConfigAction>(
            context.extensionPath,
            new VSCConfigWebviewControllerFactory(
                new VSCConfigActionApi(this._analyticsApi, this._cancellationManager),
                this._commonMessageHandler,
                this._analyticsApi,
                SETTINGS_URL,
            ),
            this._analyticsApi,
        );

        const onboardingV2ViewFactory = new SingleWebview<any, OnboardingAction>(
            context.extensionPath,
            new VSCOnboardingWebviewControllerFactory(
                new VSCOnboardingActionApi(this._analyticsApi),
                this._commonMessageHandler,
                this._analyticsApi,
                ONBOARDING_URL,
            ),
            this.analyticsApi,
        );

        const startWorkV2ViewFactory = new SingleWebview<StartWorkIssueMessage, StartWorkAction>(
            context.extensionPath,
            new VSCStartWorkWebviewControllerFactory(
                new VSCStartWorkActionApi(),
                this._commonMessageHandler,
                this._analyticsApi,
            ),
            this._analyticsApi,
        );

        const createPullRequestV2ViewFactory = new SingleWebview<WorkspaceRepo, StartWorkAction>(
            context.extensionPath,
            new VSCCreatePullRequestWebviewControllerFactory(
                new VSCCreatePullRequestActionApi(this._cancellationManager),
                this._commonMessageHandler,
                this._analyticsApi,
            ),
            this._analyticsApi,
        );

        context.subscriptions.push((this._settingsWebviewFactory = settingsV2ViewFactory));
        context.subscriptions.push((this._onboardingWebviewFactory = onboardingV2ViewFactory));
        context.subscriptions.push((this._startWorkWebviewFactory = startWorkV2ViewFactory));
        context.subscriptions.push((this._createPullRequestWebviewFactory = createPullRequestV2ViewFactory));

        const pipelinesV2Webview = new MultiWebview<Pipeline, PipelineSummaryAction>(
            context.extensionPath,
            new PipelineSummaryWebviewControllerFactory(new PipelineSummaryActionImplementation(), this._analyticsApi),
            this._analyticsApi,
        );

        context.subscriptions.push((this._pipelinesSummaryWebview = pipelinesV2Webview));

        this._pmfStats = new PmfStats(context);

        this._loginManager = new LoginManager(this._credentialManager, this._siteManager, this._analyticsClient);
        this._bitbucketHelper = new BitbucketCheckoutHelper(context.globalState);
        context.subscriptions.push(new HelpExplorer());

        try {
            await FeatureFlagClient.initialize({
                analyticsClient: this._analyticsClient,
                identifiers: {
                    analyticsAnonymousId: this.machineId,
                },
            });

            Logger.debug(`FeatureFlagClient: Succesfully initialized the client.`);
            featureFlagClientInitializedEvent(true).then((e) => {
                this.analyticsClient.sendTrackEvent(e);
            });
        } catch (err) {
            const error = err as FeatureFlagClientInitError;
            Logger.debug(`FeatureFlagClient: Failed to initialize the client: ${error.reason}`);
            featureFlagClientInitializedEvent(false, error.errorType, error.reason).then((e) => {
                this.analyticsClient.sendTrackEvent(e);
            });
        }

        FeatureFlagClient.checkExperimentStringValueWithInstrumentation(Experiments.AtlascodeAA);
        FeatureFlagClient.checkGateValueWithInstrumentation(Features.NoOpFeature);

        context.subscriptions.push(AtlascodeUriHandler.create(this._analyticsApi, this._bitbucketHelper));

        SearchJiraHelper.initialize();
        context.subscriptions.push(new CustomJQLViewProvider());
        context.subscriptions.push((this._assignedWorkItemsView = new AssignedWorkItemsViewProvider()));
    }

    static focus() {
        this._assignedWorkItemsView.focus();
    }

    static openPullRequestHandler = (pullRequestUrl: string) => {
        return openPullRequest(this._bitbucketHelper, pullRequestUrl);
    };

    private static getAnalyticsEnable(): boolean {
        const telemetryConfig = workspace.getConfiguration('telemetry');
        return telemetryConfig.get<boolean>('enableTelemetry', true);
    }

    static initializeBitbucket(bbCtx: BitbucketContext) {
        this._bitbucketContext = bbCtx;
        new PipelinesExplorer(bbCtx);
        this._context.subscriptions.push(
            (this._pullRequestDetailsWebviewFactory = new MultiWebview<PullRequest, PullRequestDetailsAction>(
                this._context.extensionPath,
                new VSCPullRequestDetailsWebviewControllerFactory(
                    new VSCPullRequestDetailsActionApi(this._cancellationManager),
                    this._commonMessageHandler,
                    this._analyticsApi,
                ),
                this._analyticsApi,
            )),
        );
        this._context.subscriptions.push((this._jiraActiveIssueStatusBar = new JiraActiveIssueStatusBar(bbCtx)));

        this._context.subscriptions.push(new BitbucketCloudPullRequestLinkProvider());
        // It seems to take a bit of time for VS Code to initialize git, if we try and find repos before that completes
        // we'll fail. Wait a few seconds before trying to check out a branch.
        setTimeout(() => {
            this._bitbucketHelper.completeBranchCheckOut();
        }, 2000);
    }

    static get machineId() {
        return env.machineId;
    }

    private static get isRemote() {
        return env.remoteName !== undefined;
    }

    private static get isWebUI() {
        return env.uiKind === UIKind.Web;
    }

    private static _isDebugging: boolean | undefined;
    public static get isDebugging() {
        if (this._isDebugging === undefined) {
            try {
                const args = process.execArgv;

                this._isDebugging = args ? args.some((arg) => isDebuggingRegex.test(arg)) : false;
            } catch {}
        }

        return this._isDebugging;
    }

    public static get configTarget(): ConfigTarget {
        return this._context.globalState.get<ConfigTarget>(ConfigTargetKey, ConfigTarget.User);
    }

    public static set configTarget(target: ConfigTarget) {
        this._context.globalState.update(ConfigTargetKey, target);
    }

    public static async testLogout() {
        Container.siteManager.getSitesAvailable(ProductJira).forEach(async (site) => {
            await Container.clientManager.removeClient(site);
            Container.siteManager.removeSite(site);
        });
    }

    public static async testLogin() {
        if (!process.env.ATLASCODE_TEST_USER_API_TOKEN) {
            // vscode notify user that this is for testing only
            window.showInformationMessage(
                'This is for testing only. Please set the ATLASCODE_TEST_USER_API_TOKEN environment variable to run this test',
            );
            return;
        }
        const authInfo = {
            username: ATLASCODE_TEST_USER_EMAIL,
            password: process.env.ATLASCODE_TEST_USER_API_TOKEN,
            user: {
                id: '',
                displayName: '',
                email: '',
                avatarUrl: '',
            },
            state: 0,
        };
        const site = {
            host: ATLASCODE_TEST_HOST,
            protocol: 'https:',
            product: {
                name: 'Jira',
                key: 'jira',
            },
        };
        await Container.loginManager.userInitiatedServerLogin(site, authInfo);
    }

    private static _version: string;
    public static get version() {
        return this._version;
    }

    public static get config() {
        // always return the latest
        return configuration.get<IConfig>();
    }

    private static _jqlManager: JQLManager;
    public static get jqlManager() {
        return this._jqlManager;
    }

    private static _context: ExtensionContext;
    public static get context() {
        return this._context;
    }

    private static _bitbucketContext: BitbucketContext;
    public static get bitbucketContext() {
        return this._bitbucketContext;
    }

    private static _explorerFocusManager: ExplorerFocusManager;
    public static get explorerFocusManager() {
        return this._explorerFocusManager;
    }

    private static _settingsWebviewFactory: SingleWebview<SectionChangeMessage, ConfigAction>;
    public static get settingsWebviewFactory() {
        return this._settingsWebviewFactory;
    }

    private static _onboardingWebviewFactory: SingleWebview<any, OnboardingAction>;
    public static get onboardingWebviewFactory() {
        return this._onboardingWebviewFactory;
    }

    private static _pullRequestDetailsWebviewFactory: MultiWebview<any, PullRequestDetailsAction>;
    public static get pullRequestDetailsWebviewFactory() {
        return this._pullRequestDetailsWebviewFactory;
    }

    private static _pipelinesSummaryWebview: MultiWebview<Pipeline, PipelineSummaryAction>;
    public static get pipelinesSummaryWebview() {
        return this._pipelinesSummaryWebview;
    }

    private static _startWorkWebviewFactory: SingleWebview<StartWorkIssueMessage, StartWorkAction>;
    public static get startWorkWebviewFactory() {
        return this._startWorkWebviewFactory;
    }

    private static _createPullRequestWebviewFactory: SingleWebview<WorkspaceRepo, StartWorkAction>;
    public static get createPullRequestWebviewFactory() {
        return this._createPullRequestWebviewFactory;
    }

    private static _createIssueWebview: CreateIssueWebview;
    public static get createIssueWebview() {
        return this._createIssueWebview;
    }

    private static _createIssueProblemsWebview: CreateIssueProblemsWebview;
    public static get createIssueProblemsWebview() {
        return this._createIssueProblemsWebview;
    }

    private static _jiraIssueViewManager: JiraIssueViewManager;
    public static get jiraIssueViewManager() {
        return this._jiraIssueViewManager;
    }

    private static _clientManager: ClientManager;
    public static get clientManager() {
        return this._clientManager;
    }

    private static _loginManager: LoginManager;
    public static get loginManager() {
        return this._loginManager;
    }

    private static _credentialManager: CredentialManager;
    public static get credentialManager() {
        return this._credentialManager;
    }

    private static _jiraActiveIssueStatusBar: JiraActiveIssueStatusBar;
    public static get jiraActiveIssueStatusBar() {
        return this._jiraActiveIssueStatusBar;
    }

    private static _siteManager: SiteManager;
    public static get siteManager() {
        return this._siteManager;
    }

    private static _jiraSettingsManager: JiraSettingsManager;
    public static get jiraSettingsManager() {
        return this._jiraSettingsManager;
    }

    private static _jiraProjectManager: JiraProjectManager;
    public static get jiraProjectManager() {
        return this._jiraProjectManager;
    }

    private static _analyticsClient: AnalyticsClient;
    public static get analyticsClient() {
        return this._analyticsClient;
    }

    private static _analyticsApi: VSCAnalyticsApi;
    public static get analyticsApi() {
        return this._analyticsApi;
    }

    private static _pmfStats: PmfStats;
    public static get pmfStats() {
        return this._pmfStats;
    }
}
