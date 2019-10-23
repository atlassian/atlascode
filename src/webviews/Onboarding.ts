import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { Product, DetailedSiteInfo, ProductJira, ProductBitbucket, isBasicAuthInfo } from '../atlclients/authInfo';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { Container } from '../container';
import { isLoginAuthAction, isAuthAction } from '../ipc/configActions';
import { authenticateServer, authenticateCloud, clearAuth } from '../commands/authenticate';
import { Logger } from '../logger';
import { authenticateButtonEvent, logoutButtonEvent } from '../analytics';
import { env, commands } from 'vscode';
import { Commands } from '../commands';

export class OnboardingWebview extends AbstractReactWebview {

    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesAvailableChange, this),
        );
    }

    public get title(): string {
        return "Getting Started";
    }
    public get id(): string {
        return "atlascodeOnboardingScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return undefined;
    }

    public async invalidate() {
        const [jiraSitesAvailable, bitbucketSitesAvailable] = this.getSitesAvailable();
        const [cloudJira, serverJira] = this.separateCloudFromServer(jiraSitesAvailable);
        const [cloudBitbucket, serverBitbucket] = this.separateCloudFromServer(bitbucketSitesAvailable);
        const isRemote = env.remoteName !== undefined;
        this.postMessage({
            type: 'update',
            isRemote: isRemote,
            jiraCloudSites: cloudJira,
            jiraServerSites: serverJira,
            bitbucketCloudSites: cloudBitbucket,
            bitbucketServerSites: serverBitbucket
        });
    }

    private onSitesAvailableChange(e: SitesAvailableUpdateEvent) {
        const [jiraSitesAvailable, bitbucketSitesAvailable] = this.getSitesAvailable();
        const [cloudJira, serverJira] = this.separateCloudFromServer(jiraSitesAvailable);
        const [cloudBitbucket, serverBitbucket] = this.separateCloudFromServer(bitbucketSitesAvailable);
        this.postMessage({
            type: 'sitesAvailableUpdate',
            jiraCloudSites: cloudJira,
            jiraServerSites: serverJira,
            bitbucketCloudSites: cloudBitbucket,
            bitbucketServerSites: serverBitbucket
        });
    }

    private getSitesAvailable(): [DetailedSiteInfo[], DetailedSiteInfo[]] {
        const isJiraConfigured = Container.siteManager.productHasAtLeastOneSite(ProductJira);
        const isBBConfigured = Container.siteManager.productHasAtLeastOneSite(ProductBitbucket);
        let jiraSitesAvailable: DetailedSiteInfo[] = [];
        let bitbucketSitesAvailable: DetailedSiteInfo[] = [];

        if (isJiraConfigured) {
            jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        }

        if (isBBConfigured) {
            bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);
        }

        return [jiraSitesAvailable, bitbucketSitesAvailable];
    }

    private separateCloudFromServer(siteList: DetailedSiteInfo[]): [DetailedSiteInfo[], DetailedSiteInfo[]] {
        let cloudSites: DetailedSiteInfo[] = [];
        let serverSites: DetailedSiteInfo[] = [];
        for(const site of siteList) {
            if(site.isCloud){
                cloudSites.push(site);
            } else {
                serverSites.push(site);
            }
        }
        return [cloudSites, serverSites];
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);
        if(!handled){
            switch (msg.action) {
                case 'openSettings': {
                    commands.executeCommand(Commands.ShowConfigPage);
                    break;
                }
                case 'closePage': {
                    this.hide();
                    break;
                }
                case 'login': {
                    handled = true;
                    if (isLoginAuthAction(msg)) {
                        if (isBasicAuthInfo(msg.authInfo)) {
                            try {
                                await authenticateServer(msg.siteInfo, msg.authInfo);
                            } catch (e) {
                                let err = new Error(`Authentication error: ${e}`);
                                Logger.error(err);
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Authentication error') });
                            }
                        } else {
                            authenticateCloud(msg.siteInfo);
                        }
                        authenticateButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    if (isAuthAction(msg)) {
                        clearAuth(msg.siteInfo);
                        logoutButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
