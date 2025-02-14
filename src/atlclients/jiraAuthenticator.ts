import { AccessibleResource, DetailedSiteInfo, OAuthProvider, ProductJira } from './authInfo';

import { Authenticator } from './authenticator';
import { CredentialManager } from './authStore';

export class JiraAuthentictor implements Authenticator {
    public async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[],
    ): Promise<DetailedSiteInfo[]> {
        let newSites: DetailedSiteInfo[] = [];

        const apiUri = provider === OAuthProvider.JiraCloudStaging ? 'api.stg.atlassian.com' : 'api.atlassian.com';

        //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
        //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);

        newSites = resources.map((r) => {
            const credentialId = CredentialManager.generateCredentialId(ProductJira.key, userId);

            return {
                avatarUrl: r.avatarUrl,
                baseApiUrl: `https://${apiUri}/ex/jira/${r.id}/rest`,
                baseLinkUrl: r.url,
                host: new URL(r.url).host,
                id: r.id,
                name: r.name,
                product: ProductJira,
                isCloud: true,
                userId: userId,
                credentialId: credentialId,
            };
        });

        return newSites;
    }
}
