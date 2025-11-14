import { rovoDevEntitlementCheckEvent } from 'src/analytics';
import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { BasicAuthInfo, DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { Logger } from 'src/logger';
import { Disposable } from 'vscode';

interface RovoDevCredential {
    authInfo: BasicAuthInfo;
    host: string;
    siteCloudId: string;
    isValid: boolean;
    isStaging: boolean;
}

export class RovoDevEntitlementChecker extends Disposable {
    private readonly _endpoint = `/gateway/api/rovodev/v3/sites/type`;
    private readonly _entitledResponse = [
        'ROVO_DEV_EVERYWHERE',
        'ROVO_DEV_STANDARD',
        'ROVO_DEV_STANDARD_TRIAL',
        'ROVO_DEV_BETA',
    ];
    private _analyticsClient: AnalyticsClient;

    constructor(analyticsClient: AnalyticsClient) {
        super(() => {});
        this._analyticsClient = analyticsClient;
    }

    public async checkEntitlement(): Promise<boolean>;
    public async checkEntitlement(site: DetailedSiteInfo): Promise<boolean>;
    public async checkEntitlement(site?: DetailedSiteInfo): Promise<boolean> {
        try {
            let credentials: RovoDevCredential | undefined = undefined;
            const allValidCredentials = await this.getValidCredentials();
            if (!allValidCredentials || allValidCredentials.length === 0) {
                throw new Error('No valid Rovo Dev credentials found');
            }

            // If checking specific site, see if valid
            if (site) {
                credentials = allValidCredentials.find((cred) => cred.host === site.host);
            } else {
                credentials = allValidCredentials.find((cred) => cred.isValid);
            }

            if (!credentials) {
                throw new Error('No valid Rovo Dev credentials found for the specified site');
            }

            const options = {
                method: 'GET',
                headers: { ...this.createHeaders(credentials) },
            };
            const response = await fetch(`https://${credentials.host}${this._endpoint}`, options);

            if (!response.ok) {
                throw new Error(`Entitlement check failed with status ${response.status}`);
            }

            const value = await response.text();
            Logger.debug(`Entitlement response: ${value}`);
            const rovoDevEnabled = this._entitledResponse.includes(value);

            rovoDevEntitlementCheckEvent(rovoDevEnabled, value).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });

            return rovoDevEnabled;
        } catch (err) {
            Logger.error(err, 'Unable to check Rovo Dev entitlement');
            rovoDevEntitlementCheckEvent(false, err.message).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });
            return false;
        }
    }

    private async getValidCredentials(): Promise<RovoDevCredential[] | undefined> {
        try {
            const allJiraSites = Container.siteManager.getSitesAvailable(ProductJira);

            const promises = allJiraSites.map(async (site) => {
                if (!site.isCloud && !site.host.endsWith('.jira-dev.com')) {
                    return;
                }

                const authInfo = await Container.credentialManager.getApiTokenIfExists(site);

                if (!authInfo) {
                    return;
                }

                // verify the credentials work
                let isValid: boolean;
                try {
                    await Container.clientManager.jiraClient(site);
                    isValid = true;
                } catch {
                    isValid = false;
                }

                return {
                    authInfo,
                    host: site.host,
                    siteCloudId: site.id,
                    isValid,
                    isStaging: site.host.endsWith('.jira-dev.com'),
                };
            });

            const results = (await Promise.all(promises)).filter((res) => res !== undefined);

            return results;
        } catch (error) {
            Logger.error(error, 'Error checking for Rovo Dev Entitlement');
            return undefined;
        }
    }

    private createHeaders(cred: RovoDevCredential): Record<string, string> {
        const headers: Record<string, string> = {};

        const authInfo = cred.authInfo;
        const encodedAuth = Buffer.from(`${authInfo.username}:${authInfo.password}`).toString('base64');

        headers['Authorization'] = `Basic ${encodedAuth}`;

        headers['X-RovoDev-Billing-CloudId'] = cred.siteCloudId;

        return headers;
    }
}
