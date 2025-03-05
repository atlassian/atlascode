import { AccessibleResource, DetailedSiteInfo, OAuthProvider, ProductBitbucket } from './authInfo';
import { Authenticator } from './authenticator';
import { CredentialManager } from './authStore';

export class BitbucketAuthenticator implements Authenticator {
    public async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[],
    ): Promise<DetailedSiteInfo[]> {
        let newSites: DetailedSiteInfo[] = [];

        if (resources.length > 0) {
            const resource = resources[0];
            const hostname = provider === OAuthProvider.BitbucketCloud ? 'bitbucket.org' : 'staging.bb-inf.net';
            const baseApiUrl =
                provider === OAuthProvider.BitbucketCloud
                    ? 'https://api.bitbucket.org/2.0'
                    : 'https://api-staging.bb-inf.net/2.0';
            const siteName = provider === OAuthProvider.BitbucketCloud ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

            const credentialId = CredentialManager.generateCredentialId(ProductBitbucket.key, userId);

            // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
            newSites = [
                {
                    avatarUrl: '',
                    baseApiUrl: baseApiUrl,
                    baseLinkUrl: resource.url,
                    host: hostname,
                    id: resource.id,
                    name: siteName,
                    product: ProductBitbucket,
                    isCloud: true,
                    userId: userId,
                    credentialId: credentialId,
                    hasResolutionField: false,
                },
            ];
        }

        return newSites;
    }
}
