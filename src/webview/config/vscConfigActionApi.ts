import {
    AutocompleteSuggestion,
    FilterSearchResults,
    JQLAutocompleteData,
    JQLErrors,
} from '@atlassianlabs/jira-pi-common-models';
import { getProxyHostAndPort } from '@atlassianlabs/pi-client-common';
import axios, { CancelToken, CancelTokenSource } from 'axios';
import { flatten } from 'flatten-anything';
import { merge } from 'merge-anything';
import { join as pathJoin } from 'path';
import { commands, ConfigurationTarget, env, Uri, window, workspace, WorkspaceEdit } from 'vscode';

import {
    AuthInfo,
    DetailedSiteInfo,
    emptyAuthInfo,
    emptyBasicAuthInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from '../../atlclients/authInfo';
import { configuration, IConfig, JQLEntry } from '../../config/configuration';
import { Container } from '../../container';
import { getFeedbackUser } from '../../feedback/feedbackUser';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { FeedbackUser } from '../../lib/ipc/models/common';
import { ConfigTarget, FlattenedConfig } from '../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../lib/ipc/toUI/config';
import { ConfigActionApi } from '../../lib/webview/controller/config/configActionApi';
import { FocusEventActions } from '../ExplorerFocusManager';

export class VSCConfigActionApi implements ConfigActionApi {
    private _analyticsApi: AnalyticsApi;
    private _cancelMan: CancellationManager;

    constructor(analyticsApi: AnalyticsApi, cancelMan: CancellationManager) {
        this._analyticsApi = analyticsApi;
        this._cancelMan = cancelMan;
    }
    public async authenticateServer(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        return await Container.loginManager.userInitiatedServerLogin(site, authInfo);
    }

    public async authenticateCloud(site: SiteInfo, callback: string): Promise<void> {
        return Container.loginManager.userInitiatedOAuthLogin(site, callback);
    }

    public async clearAuth(site: DetailedSiteInfo): Promise<void> {
        await Container.clientManager.removeClient(site);
        await Container.siteManager.removeSite(site);
    }

    public async fetchJqlOptions(site: DetailedSiteInfo): Promise<JQLAutocompleteData> {
        const client = await Container.clientManager.jiraClient(site);
        return await client.getJQLAutocompleteData();
    }

    public async fetchJqlSuggestions(
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortKey?: string,
    ): Promise<AutocompleteSuggestion[]> {
        const client = await Container.clientManager.jiraClient(site);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this._cancelMan.set(abortKey, signal);
        }

        return await client.getFieldAutoCompleteSuggestions(fieldName, userInput, predicateName, cancelToken);
    }

    public async fetchFilterSearchResults(
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortKey?: string,
    ): Promise<FilterSearchResults> {
        const client = await Container.clientManager.jiraClient(site);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this._cancelMan.set(abortKey, signal);
        }

        return await client.searchFilters(query, maxResults, startAt, cancelToken);
    }

    public async validateJql(site: DetailedSiteInfo, jql: string, abortKey?: string): Promise<JQLErrors> {
        const client = await Container.clientManager.jiraClient(site);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this._cancelMan.set(abortKey, signal);
        }

        return await client.validateJql(jql, cancelToken);
    }

    public getSitesAvailable(): [DetailedSiteInfo[], DetailedSiteInfo[]] {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        const bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);

        return [jiraSitesAvailable, bitbucketSitesAvailable];
    }

    public async getSitesWithAuth(): Promise<[SiteWithAuthInfo[], SiteWithAuthInfo[]]> {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        const bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);

        const jiraSites = await Promise.all(
            jiraSitesAvailable.map(async (jiraSite: DetailedSiteInfo): Promise<SiteWithAuthInfo> => {
                const jiraAuth = await Container.credentialManager.getAuthInfo(jiraSite, false);
                return {
                    site: jiraSite,
                    auth: jiraAuth ? jiraAuth : jiraSite.isCloud ? emptyAuthInfo : emptyBasicAuthInfo,
                };
            }),
        );

        const bitbucketSites = await Promise.all(
            bitbucketSitesAvailable.map(async (bitbucketSite: DetailedSiteInfo): Promise<SiteWithAuthInfo> => {
                const bitbucketAuth = await Container.credentialManager.getAuthInfo(bitbucketSite);
                return {
                    site: bitbucketSite,
                    auth: bitbucketAuth ? bitbucketAuth : bitbucketSite.isCloud ? emptyAuthInfo : emptyBasicAuthInfo,
                };
            }),
        );

        return [jiraSites, bitbucketSites];
    }

    public async getFeedbackUser(): Promise<FeedbackUser> {
        return await getFeedbackUser();
    }

    public getIsRemote(): boolean {
        return env.remoteName !== undefined;
    }

    public getConfigTarget(): ConfigTarget {
        return Container.configTarget;
    }

    public setConfigTarget(target: ConfigTarget): void {
        Container.configTarget = target;
    }

    public shouldShowTunnelOption(): boolean {
        const [pHost] = getProxyHostAndPort();
        if (pHost.trim() !== '') {
            return true;
        }

        return false;
    }

    public flattenedConfigForTarget(target: ConfigTarget): FlattenedConfig {
        const inspect = configuration.inspect<IConfig>();
        switch (target) {
            case ConfigTarget.Workspace: {
                if (inspect.workspaceValue) {
                    return merge(flatten(inspect.defaultValue!), flatten(inspect.workspaceValue!));
                }

                return flatten(inspect.defaultValue!);
            }
            case ConfigTarget.WorkspaceFolder: {
                if (inspect.workspaceFolderValue) {
                    return merge(flatten(inspect.defaultValue!), flatten(inspect.workspaceFolderValue!));
                }

                return flatten(inspect.defaultValue!);
            }
            default: {
                if (inspect.globalValue) {
                    return merge(flatten(inspect.defaultValue!), flatten(inspect.globalValue!));
                }

                return flatten(inspect.defaultValue!);
            }
        }
    }

    public async updateSettings(
        target: ConfigTarget,
        changes: { [key: string]: any },
        removes?: string[],
    ): Promise<void> {
        let vscTarget = ConfigurationTarget.Global;

        switch (target) {
            case ConfigTarget.User: {
                vscTarget = ConfigurationTarget.Global;
                break;
            }
            case ConfigTarget.Workspace: {
                vscTarget = ConfigurationTarget.Workspace;
                break;
            }
            case ConfigTarget.WorkspaceFolder: {
                vscTarget = ConfigurationTarget.WorkspaceFolder;
                break;
            }
        }

        for (const key in changes) {
            const value = changes[key];

            // if this is a jql edit, we need to figure out which one changed
            let jqlSiteId: string | undefined = undefined;

            if (key === 'jira.jqlList') {
                if (Array.isArray(value)) {
                    const currentJQLs = configuration.get<JQLEntry[]>('jira.jqlList');
                    const newJqls = value.filter(
                        (entry: JQLEntry) => currentJQLs.find((cur) => cur.id === entry.id) === undefined,
                    );
                    if (newJqls.length > 0) {
                        jqlSiteId = newJqls[0].siteId;
                    }
                }
            }

            await configuration.update(key, value, vscTarget);

            if (typeof value === 'boolean') {
                this._analyticsApi.fireFeatureChangeEvent(key, value);
            }

            if (key === 'jira.jqlList' && jqlSiteId) {
                const site = Container.siteManager.getSiteForId(ProductJira, jqlSiteId);
                if (site) {
                    this._analyticsApi.fireCustomJQLCreatedEvent(site);
                }
            }
        }

        if (removes) {
            for (const key of removes) {
                await configuration.update(key, undefined, vscTarget);
            }
        }
    }

    public async openJsonSettingsFile(target: ConfigTarget): Promise<void> {
        switch (target) {
            case ConfigTarget.User: {
                commands.executeCommand('workbench.action.openSettingsJson');
                break;
            }
            case ConfigTarget.Workspace: {
                if (Array.isArray(workspace.workspaceFolders) && workspace.workspaceFolders.length > 0) {
                    workspace.workspaceFile
                        ? await commands.executeCommand('workbench.action.openWorkspaceConfigFile')
                        : this.openWorkspaceSettingsJson(workspace.workspaceFolders[0].uri.fsPath);
                }
                break;
            }
        }
    }

    public createJiraIssue(): void {
        Container.explorerFocusManager.fireEvent(FocusEventActions.CREATEISSUE, true);
    }

    public viewJiraIssue(): void {
        Container.explorerFocusManager.fireEvent(FocusEventActions.VIEWISSUE, true);
    }

    public createPullRequest(): void {
        Container.explorerFocusManager.fireEvent(FocusEventActions.CREATEPULLREQUEST, true);
    }

    public viewPullRequest(): void {
        Container.explorerFocusManager.fireEvent(FocusEventActions.VIEWPULLREQUEST, true);
    }

    private openWorkspaceSettingsJson(rootPath: string) {
        const editor = new WorkspaceEdit();

        // set filepath for settings.json
        const filePath = pathJoin(rootPath, '.vscode', 'settings.json');

        const openPath = Uri.file(filePath);
        // create settings.json if it does not exist
        editor.createFile(openPath, { ignoreIfExists: true });
        // open workspace settings.json
        workspace.applyEdit(editor).then(() => {
            workspace.openTextDocument(openPath).then((doc) => {
                window.showTextDocument(doc);
            });
        });
    }
}
