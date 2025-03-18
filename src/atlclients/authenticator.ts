import { AccessibleResource, DetailedSiteInfo, OAuthProvider } from './authInfo';

/**
 * Authenticator encapsulates the information needed to authenticate with an OAuth service.
 */

export interface Authenticator {
    getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[],
    ): Promise<DetailedSiteInfo[]>;
}
