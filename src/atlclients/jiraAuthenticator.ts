import { AccessibleResource, DetailedSiteInfo, OAuthProvider, ProductJira } from './authInfo';
import { Authenticator } from './authenticator';
import { CredentialManager } from './authStore';
import { Container } from '../container';

export class JiraAuthentictor implements Authenticator {
    public async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[],
    ): Promise<DetailedSiteInfo[]> {
        const apiUri = provider === OAuthProvider.JiraCloudStaging ? 'api.stg.atlassian.com' : 'api.atlassian.com';

        //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
        //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);

        const newSites = resources.map(async (r) => {
            const credentialId = CredentialManager.generateCredentialId(ProductJira.key, userId);

            const siteDetails: DetailedSiteInfo = {
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
                hasResolutionField: false,
            };

            const client = await Container.clientManager.jiraClient(siteDetails);
            const fields = await client.getFields();
            siteDetails.hasResolutionField = fields.some((f) => f.id === 'resolution');

            return siteDetails;
        });

        return await Promise.all(newSites);
    }
}
