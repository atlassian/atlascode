import { SentryConfigs } from 'src/util/sentryConfig';
import { v4 } from 'uuid';
import { env, ExtensionContext, languages, UIKind } from 'vscode';
import * as vscode from 'vscode';

import { featureFlagClientInitializedEvent } from './analytics';
import { AnalyticsClient, analyticsClient } from './analytics-node-client/src/client.min.js';
import { Product } from './atlclients/authInfo';
import { CredentialManager } from './atlclients/authStore';
import { ClientManager } from './atlclients/clientManager';
import { LoginManager } from './atlclients/loginManager';
import { BitbucketContext } from './bitbucket/bbContext';
import { BitbucketCheckoutHelper } from './bitbucket/checkoutHelper';
import { CheckoutHelper } from './bitbucket/interfaces';
import { PullRequest, WorkspaceRepo } from './bitbucket/model';
import { BitbucketCloudPullRequestLinkProvider } from './bitbucket/terminal-link/createPrLinkProvider';
import { CommandContext, setCommandContext } from './commandContext';
import { registerDebugCommands } from './commands';
import { openPullRequest } from './commands/bitbucket/pullRequest';
import { configuration, IConfig } from './config/configuration';
import { PmfStats } from './feedback/pmfStats';
import { JQLManager } from './jira/jqlManager';
import { JiraProjectManager } from './jira/projectManager';
import { JiraSettingsManager } from './jira/settingsManager';
import { CancellationManager } from './lib/cancellation';
import { ConfigAction } from './lib/ipc/fromUI/config';
import { PipelineSummaryAction } from './lib/ipc/fromUI/pipelineSummary';
import { PullRequestDetailsAction } from './lib/ipc/fromUI/pullRequestDetails';
import { StartWorkAction } from './lib/ipc/fromUI/startWork';
import { ConfigTarget } from './lib/ipc/models/config';
import { SectionChangeMessage, SectionV3ChangeMessage } from './lib/ipc/toUI/config';
import { StartWorkIssueMessage } from './lib/ipc/toUI/startWork';
import { CommonActionMessageHandler } from './lib/webview/controller/common/commonActionMessageHandler';
import { Logger } from './logger';
import OnboardingProvider from './onboarding/onboardingProvider';
import { registerQuickAuthCommand } from './onboarding/quickFlow';
import { Pipeline } from './pipelines/model';
import { RovodevCommandContext } from './rovo-dev/api/componentApi';
import { RovodevStaticConfig } from './rovo-dev/api/rovodevStaticConfig';
import { RovoDevCodeActionProvider } from './rovo-dev/rovoDevCodeActionProvider';
import { RovoDevLanguageServerProvider } from './rovo-dev/rovoDevLanguageServerProvider';
import { RovoDevProcessManager } from './rovo-dev/rovoDevProcessManager';
import { RovoDevTelemetryProvider } from './rovo-dev/rovoDevTelemetryProvider';
import { RovoDevWebviewProvider } from './rovo-dev/rovoDevWebviewProvider';
import { SentryConfig, SentryService } from './sentry';
import { SiteManager } from './siteManager';
import { AtlascodeUriHandler, SETTINGS_URL } from './uriHandler';
import { Experiments, FeatureFlagClient, FeatureFlagClientInitError, Features } from './util/featureFlags';
import { isDebugging } from './util/isDebugging';
import { RovoDevEntitlementChecker } from './util/rovo-dev-entitlement/rovoDevEntitlementChecker';
import { AuthStatusBar } from './views/authStatusBar';
import { HelpExplorer } from './views/HelpExplorer';
import { JiraActiveIssueStatusBar } from './views/jira/activeIssueStatusBar';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';
import { SearchAllJiraHelper } from './views/jira/searchAllJiraHelper';
import { SearchJiraHelper } from './views/jira/searchJiraHelper';
import { CustomJQLViewProvider } from './views/jira/treeViews/customJqlViewProvider';
import { AssignedWorkItemsViewProvider } from './views/jira/treeViews/jiraAssignedWorkItemsViewProvider';
import { PipelinesExplorer } from './views/pipelines/PipelinesExplorer';
import { VSCAnalyticsApi } from './vscAnalyticsApi';
import { VSCCommonMessageHandler } from './webview/common/vscCommonMessageActionHandler';
import { VSCConfigActionApi } from './webview/config/vscConfigActionApi';
import { VSCConfigV3WebviewControllerFactory } from './webview/config/vscConfigV3WebviewControllerFactory';
import { VSCConfigWebviewControllerFactory } from './webview/config/vscConfigWebviewControllerFactory';
import { ExplorerFocusManager } from './webview/ExplorerFocusManager';
import { MultiWebview } from './webview/multiViewFactory';
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
import { CreateWorkItemWebviewProvider } from './work-items/create-work-item/createWorkItemWebviewProvider';

const ConfigTargetKey = 'configurationTarget';

export class Container {
    private static _cancellationManager: CancellationManager;
    private static _commonMessageHandler: CommonActionMessageHandler;
    private static _bitbucketHelper: CheckoutHelper;
    private static _assignedWorkItemsView: AssignedWorkItemsViewProvider;
    private static _helpExplorer: HelpExplorer;

    // Container for all rovodev components that might get toggled by feature flags
    private static _rovodevDisposable?: vscode.Disposable = undefined;

    static async initialize(context: ExtensionContext, version: string) {
        canFetchInternalUrl().then((success) => {
            this._isInAtlassianNetwork = success;
        });

        const analyticsEnv: string = this.isDebugging ? 'staging' : 'prod';

        this._analyticsClient = analyticsClient({
            origin: 'desktop',
            env: analyticsEnv,
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: this.machineId,
            enable: this.getAnalyticsEnabled(),
        });

        context.subscriptions.push(
            env.onDidChangeTelemetryEnabled(() => {
                this._analyticsClient.setAnalyticsEnabled(this.getAnalyticsEnabled());
            }),
        );

        if (this.isDebugging) {
            setCommandContext(CommandContext.DebugMode, true);
            registerDebugCommands(context);
        }

        this._cancellationManager = new Map();
        this._analyticsApi = new VSCAnalyticsApi(this._analyticsClient, this.isRemote, this.isWebUI);
        this._commonMessageHandler = new VSCCommonMessageHandler(this._analyticsApi, this._cancellationManager);

        this._context = context;
        this._version = version;

        context.subscriptions.push((this._credentialManager = new CredentialManager(context, this._analyticsClient)));
        context.subscriptions.push((this._siteManager = new SiteManager(context.globalState)));
        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._jiraProjectManager = new JiraProjectManager()));
        context.subscriptions.push((this._jiraSettingsManager = new JiraSettingsManager()));
        context.subscriptions.push((this._createIssueWebview = new CreateIssueWebview(context.extensionPath)));
        context.subscriptions.push(
            (this._createIssueProblemsWebview = new CreateIssueProblemsWebview(context.extensionPath)),
        );
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
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

        const settingsV3ViewFactory = new SingleWebview<SectionV3ChangeMessage, ConfigAction>(
            context.extensionPath,
            new VSCConfigV3WebviewControllerFactory(
                new VSCConfigActionApi(this._analyticsApi, this._cancellationManager),
                this._commonMessageHandler,
                this._analyticsApi,
                SETTINGS_URL,
            ),
            this._analyticsApi,
        );

        const startWorkViewFactory = new SingleWebview<StartWorkIssueMessage, StartWorkAction>(
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

        context.subscriptions.push((this._startWorkWebviewFactory = startWorkViewFactory));
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
        this._helpExplorer = new HelpExplorer();
        context.subscriptions.push(this._helpExplorer);

        this._featureFlagClient = FeatureFlagClient.getInstance();

        await this.initializeFeatureFlagClient();

        if (this._featureFlagClient.checkExperimentValue(Experiments.AtlascodeNewSettingsExperiment)) {
            context.subscriptions.push((this._settingsWebviewFactory = settingsV3ViewFactory));
        } else {
            context.subscriptions.push((this._settingsWebviewFactory = settingsV2ViewFactory));
        }

        if (this._featureFlagClient.checkGate(Features.UseNewAuthFlow)) {
            setCommandContext(CommandContext.UseNewAuthFlow, true);
            context.subscriptions.push(registerQuickAuthCommand());
        } else {
            setCommandContext(CommandContext.UseNewAuthFlow, false);
        }

        context.subscriptions.push(
            (this._rovoDevEntitlementChecker = new RovoDevEntitlementChecker(this._analyticsClient)),
        );

        // in Boysenberry we don't need to listen to Jira auth updates
        if (!RovodevStaticConfig.isBBY) {
            // Check Rovo Dev entitlement on startup
            await this._rovoDevEntitlementChecker.triggerEntitlementNotification();
            // refresh Rovo Dev when auth sites change
            this._siteManager.onDidSitesAvailableChange(async () => {
                await this.updateFeatureFlagTenantId();
                await this.refreshRovoDev(context);
                await this._rovoDevEntitlementChecker.triggerEntitlementNotification();
            });

            // refresh Rovo Dev when Jira gets enabled or disabled
            context.subscriptions.push(
                configuration.onDidChange(async (e) => {
                    if (configuration.changed(e, 'jira.enabled') || configuration.changed(e, 'rovodev.enabled')) {
                        await this.refreshRovoDev(context);
                        await this._rovoDevEntitlementChecker.triggerEntitlementNotification();
                    }
                }, this),
            );
        }

        await this.updateFeatureFlagTenantId();

        context.subscriptions.push(AtlascodeUriHandler.create(this._analyticsApi, this._bitbucketHelper));

        SearchJiraHelper.initialize();
        SearchAllJiraHelper.initialize();
        context.subscriptions.push(new CustomJQLViewProvider());
        context.subscriptions.push((this._assignedWorkItemsView = new AssignedWorkItemsViewProvider()));

        if (this.featureFlagClient.checkGate(Features.CreateWorkItemWebviewV2)) {
            context.subscriptions.push(
                (this._createWorkItemWebviewProvider = new CreateWorkItemWebviewProvider(
                    context,
                    context.extensionPath,
                )),
            );
        }
        this._onboardingProvider = new OnboardingProvider();

        this.refreshRovoDev(context);

        // Initialize Sentry for error tracking

        const sentryConfig: SentryConfig = {
            enabled: SentryConfigs.enabled === 'true',
            featureFlagEnabled: RovodevStaticConfig.isBBY || this.featureFlagClient.checkGate(Features.SentryLogging),
            dsn: SentryConfigs.dsn,
            environment: SentryConfigs.environment || 'development',
            sampleRate: SentryConfigs.sampleRate || 1.0,
            atlasCodeVersion: version,
            machineId: this.machineId,
            appInstanceId: this.appInstanceId,
            sandboxSessionId: this.isBoysenberryMode ? process.env.SANDBOX_SESSION_ID : undefined,
        };
        await SentryService.getInstance().initialize(sentryConfig, (error: string) => {
            this.analyticsApi.fireSentryCapturedExceptionFailedEvent({ error });
        });
    }

    private static async initializeFeatureFlagClient() {
        try {
            await this._featureFlagClient.initialize({
                analyticsAnonymousId: this.machineId,
            });

            this.pushFeatureUpdatesToUI();
            Logger.debug(`FeatureFlagClient: Succesfully initialized the client.`);
            featureFlagClientInitializedEvent(true).then((e) => {
                this.analyticsClient.sendTrackEvent(e);
            });
        } catch (err) {
            const error = err as FeatureFlagClientInitError;
            Logger.error(error, `FeatureFlagClient: Failed to initialize the client`);
            featureFlagClientInitializedEvent(false, error.errorType, error.message).then((e) => {
                this.analyticsClient.sendTrackEvent(e);
            });
        }
    }
    static async updateFeatureFlagTenantId(): Promise<boolean> {
        const tenantId = Container.config.jira.enabled ? this._siteManager.primarySite?.id : undefined;

        try {
            await this._featureFlagClient.updateUser({ tenantId });
            this.pushFeatureUpdatesToUI();
            return true;
        } catch (err) {
            Logger.error(err, "FeatureFlagClient: Failed to update user's tenantId");
            return false;
        }
    }

    public static async isAtlassianUser(...products: Product[]) {
        for (const product of products) {
            try {
                const authInfo = await this._credentialManager.getAllValidAuthInfo(product);
                if (authInfo.findIndex((x) => x.user.email.endsWith('@atlassian.com')) >= 0) {
                    return true;
                }
            } catch {}
        }

        return false;
    }

    private static async refreshRovoDev(context: ExtensionContext) {
        const shouldEnableRovoDev = (this.config.rovodev.enabled && this.config.jira.enabled) || this.isBoysenberryMode;

        if (shouldEnableRovoDev) {
            await this.enableRovoDev(context);
        } else {
            await this.disableRovoDev();
        }
    }

    private static async enableRovoDev(context: ExtensionContext) {
        this._isRovoDevEnabled = true;

        if (this._rovodevDisposable) {
            if (this.isBoysenberryMode) {
                return;
            }

            try {
                // The process should be already running, so we signal that the credentials may have changed
                await RovoDevProcessManager.refreshRovoDevCredentials(context);
            } catch (error) {
                RovoDevTelemetryProvider.logError(error, 'Refreshing Rovo Dev credentials');
                return;
            }
        } else {
            try {
                // don't add anything async before initializing _rovodevDisposable
                const lspEnabled = this._featureFlagClient.checkGate(Features.RovoDevLspEnabled);

                this._rovodevDisposable = vscode.Disposable.from(
                    languages.registerCodeActionsProvider({ scheme: 'file' }, new RovoDevCodeActionProvider(), {
                        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
                    }),
                    (this._rovodevWebviewProvider = new RovoDevWebviewProvider(context, context.extensionPath)),
                    ...(lspEnabled
                        ? [(this._rovodevLanguageServerProvider = new RovoDevLanguageServerProvider(context))]
                        : []),
                );

                context.subscriptions.push(this._rovodevDisposable);

                // this enables the Rovo Dev activity bar
                await setCommandContext(RovodevCommandContext.RovoDevEnabled, true);

                // only in Boysenberry, we auto-focus the Rovo Dev view
                if (this.isBoysenberryMode) {
                    await vscode.commands.executeCommand('atlascode.views.rovoDev.webView.focus');
                } else {
                    // Update help explorer to show Rovo Dev content
                    this._helpExplorer.refresh();

                    // Start the Rovo Dev process
                    await RovoDevProcessManager.initializeRovoDev(context);
                }
            } catch (error) {
                RovoDevTelemetryProvider.logError(error, 'Enabling Rovo Dev');
            }
        }

        try {
            // Refresh all issue views to show the secret button
            this.jiraIssueViewManager.refreshAll();
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Refreshing Jira issue views');
            return;
        }
    }

    private static async disableRovoDev() {
        if (this.isBoysenberryMode) {
            RovoDevTelemetryProvider.logError(new Error('disableRovoDev called in Boysenberry mode'));
            return;
        }

        this._isRovoDevEnabled = false;

        if (!this._rovodevDisposable) {
            // Already disabled
            return;
        }

        // Update help explorer to hide Rovo Dev content
        this._helpExplorer.refresh();

        try {
            // don't add anything async before disposing _rovodevDisposable
            this._rovodevDisposable.dispose();
            this._rovodevDisposable = undefined;

            await setCommandContext(RovodevCommandContext.RovoDevEnabled, false);
            await RovoDevProcessManager.deactivateRovoDevProcessManager();
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Disabling Rovo Dev');
        }

        try {
            // Refresh all issue views to show the secret button
            this.jiraIssueViewManager.refreshAll();
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Refreshing Jira issue views');
            return;
        }
    }

    private static pushFeatureUpdatesToUI() {
        const factories = [
            this.settingsWebviewFactory,
            this.startWorkWebviewFactory,
            this.createPullRequestWebviewFactory,
        ];

        for (const factory of factories) {
            if (typeof factory?.updateFeatureMetadata === 'function') {
                factory.updateFeatureMetadata();
            }
        }
    }

    static focus() {
        this._assignedWorkItemsView.focus();
    }

    static get assignedWorkItemsView() {
        return this._assignedWorkItemsView;
    }

    static setIsEditorFocused(isFocused: boolean) {
        setCommandContext(CommandContext.IsEditorFocused, isFocused);
    }

    static openPullRequestHandler = (pullRequestUrl: string) => {
        return openPullRequest(this._bitbucketHelper, pullRequestUrl);
    };

    private static getAnalyticsEnabled(): boolean {
        if (process.env.DISABLE_ANALYTICS === '1') {
            Logger.debug('[Analytics] Analytics disabled via DISABLE_ANALYTICS env var');
            return false;
        }

        const telemetryEnabled = env.isTelemetryEnabled || this.isBoysenberryMode;
        Logger.debug(`[Analytics] VS Code telemetry enabled: ${telemetryEnabled}`);

        return telemetryEnabled;
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

    public static get machineId() {
        return env.machineId;
    }

    public static get isRemote() {
        return !!env.remoteName;
    }

    private static get isWebUI() {
        return env.uiKind === UIKind.Web;
    }

    public static get isDebugging() {
        return isDebugging();
    }

    public static get isBoysenberryMode() {
        return !!RovodevStaticConfig.isBBY;
    }

    public static get configTarget(): ConfigTarget {
        return this._context.globalState.get<ConfigTarget>(ConfigTargetKey, ConfigTarget.User);
    }

    public static set configTarget(target: ConfigTarget) {
        this._context.globalState.update(ConfigTargetKey, target);
    }

    private static _appInstanceId: string;
    /**
     * An instance ID randomly generated to identify this specific instance.
     * Note: closing/opening a workspace causes this ID to change.
     */
    public static get appInstanceId() {
        if (!this._appInstanceId) {
            this._appInstanceId = v4();
        }
        return this._appInstanceId;
    }

    private static _featureFlagClient: FeatureFlagClient;
    public static get featureFlagClient() {
        return this._featureFlagClient;
    }

    private static _isInAtlassianNetwork: boolean | undefined;
    public static get isInAtlassianNetwork() {
        return this._isInAtlassianNetwork;
    }

    private static _isRovoDevEnabled: boolean;
    public static get isRovoDevEnabled() {
        return this._isRovoDevEnabled;
    }

    public static get isRovoDevActive(): boolean {
        return this._isRovoDevEnabled && this._rovodevWebviewProvider && !this._rovodevWebviewProvider.isDisabled;
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

    private static _settingsWebviewFactory: SingleWebview<SectionChangeMessage | SectionV3ChangeMessage, ConfigAction>;
    public static get settingsWebviewFactory() {
        return this._settingsWebviewFactory;
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

    private static _onboardingProvider: OnboardingProvider;
    public static get onboardingProvider() {
        return this._onboardingProvider;
    }

    private static _rovodevWebviewProvider: RovoDevWebviewProvider;
    public static get rovodevWebviewProvider() {
        return this._rovodevWebviewProvider;
    }

    private static _rovodevLanguageServerProvider: RovoDevLanguageServerProvider;
    public static get rovodevLanguageServerProvider() {
        return this._rovodevLanguageServerProvider;
    }

    private static _rovoDevEntitlementChecker: RovoDevEntitlementChecker;
    public static get rovoDevEntitlementChecker() {
        return this._rovoDevEntitlementChecker;
    }

    private static _createWorkItemWebviewProvider: CreateWorkItemWebviewProvider;
    public static get createWorkItemWebviewProvider() {
        return this._createWorkItemWebviewProvider;
    }
}

async function canFetchInternalUrl(): Promise<boolean> {
    try {
        const result = await fetch('http://github.internal.atlassian.com/', {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });

        const statusKind = Math.floor((result.status || 0) / 100);
        return statusKind === 2 || statusKind === 3;
    } catch {
        return false;
    }
}
