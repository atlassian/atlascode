import { flatten } from 'flatten-anything';
import { merge } from 'merge-anything';
import { ConfigurationTarget, env } from 'vscode';

import {
    AuthInfo,
    DetailedSiteInfo,
    emptyAuthInfo,
    emptyBasicAuthInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from '../../atlclients/authInfo';
import { configuration, IConfig } from '../../config/configuration';
import { Container } from '../../container';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { ConfigSection, ConfigSubSection, ConfigTarget, FlattenedConfig } from '../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../lib/ipc/toUI/config';
import { OnboardingActionApi } from '../../lib/webview/controller/onboarding/onboardingActionApi';
import { FocusEventActions } from '../ExplorerFocusManager';

export class VSCOnboardingActionApi implements OnboardingActionApi {
    private _analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this._analyticsApi = analyticsApi;
    }

    public async authenticateServer(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        return await Container.loginManager.userInitiatedServerLogin(site, authInfo, true);
    }

    public async authenticateCloud(site: SiteInfo, callback: string): Promise<void> {
        return Container.loginManager.userInitiatedOAuthLogin(site, callback, true);
    }

    public async clearAuth(site: DetailedSiteInfo): Promise<void> {
        await Container.clientManager.removeClient(site);
        Container.siteManager.removeSite(site);
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
                const jiraAuth = await Container.credentialManager.getAuthInfo(jiraSite);
                return {
                    site: jiraSite,
                    auth: jiraAuth ? jiraAuth : jiraSite.isCloud ? emptyAuthInfo : emptyBasicAuthInfo,
                };
            }),
        );

        const bitbucketSites = await Promise.all(
            bitbucketSitesAvailable.map(async (bitbucketSite: DetailedSiteInfo): Promise<SiteWithAuthInfo> => {
                let authInfo = await Container.credentialManager.getAuthInfo(bitbucketSite);
                if (!authInfo) {
                    if (bitbucketSite.isCloud) {
                        authInfo = emptyAuthInfo;
                    } else {
                        authInfo = emptyBasicAuthInfo;
                    }
                }
                return {
                    site: bitbucketSite,
                    auth: authInfo,
                };
            }),
        );

        return [jiraSites, bitbucketSites];
    }

    public getIsRemote(): boolean {
        return env.remoteName !== undefined;
    }

    public getConfigTarget(): ConfigTarget {
        return Container.configTarget;
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

            await configuration.update(key, value, vscTarget);

            if (typeof value === 'boolean') {
                this._analyticsApi.fireFeatureChangeEvent(key, value);
            }
        }

        if (removes) {
            for (const key of removes) {
                await configuration.update(key, undefined, vscTarget);
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

    public closePage(): void {
        Container.onboardingWebviewFactory.hide();
    }

    public openSettings(section?: ConfigSection, subsection?: ConfigSubSection): void {
        Container.settingsWebviewFactory.createOrShow(
            section ? { section: section, subSection: subsection } : undefined,
        );
    }
}
