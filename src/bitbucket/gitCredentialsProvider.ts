import { Uri } from 'vscode';

import {
    AuthInfoState,
    BasicAuthInfo,
    isBasicAuthInfo,
    isOAuthInfo,
    isPATAuthInfo,
    OAuthInfo,
    PATAuthInfo,
    ProductBitbucket,
} from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';
import { Credentials, CredentialsProvider } from '../typings/git';

/**
 * Bitbucket username used for Git HTTPS when authenticating with an OAuth access token or API token.
 * @see https://support.atlassian.com/bitbucket-cloud/docs/use-app-passwords/
 */
const BITBUCKET_TOKEN_AUTH_USERNAME = 'x-token-auth';

/**
 * Supplies Git (pull, push, fetch) with Bitbucket credentials from the extension's auth store.
 * This allows git sync commands to succeed when the user has logged into Bitbucket via the extension.
 */
export class BitbucketGitCredentialsProvider implements CredentialsProvider {
    async getCredentials(host: Uri): Promise<Credentials | undefined> {
        const hostname = host.authority?.split(':')[0] ?? host.toString();
        if (!hostname) {
            return undefined;
        }

        const site = Container.siteManager?.getSiteForHostname(ProductBitbucket, hostname);
        if (!site) {
            return undefined;
        }

        const authInfo = await Container.credentialManager.getAuthInfo(site, true);
        if (authInfo?.state !== AuthInfoState.Valid) {
            return undefined;
        }

        if (isOAuthInfo(authInfo)) {
            return this.credentialsFromOAuth(authInfo);
        }
        if (isBasicAuthInfo(authInfo)) {
            return this.credentialsFromBasic(authInfo);
        }
        if (isPATAuthInfo(authInfo)) {
            return this.credentialsFromPAT(authInfo);
        }

        Logger.debug(`BitbucketGitCredentialsProvider: unsupported auth type for host ${hostname}`);
        return undefined;
    }

    private credentialsFromOAuth(info: OAuthInfo): Credentials {
        return {
            username: BITBUCKET_TOKEN_AUTH_USERNAME,
            password: info.access,
        };
    }

    private credentialsFromBasic(info: BasicAuthInfo): Credentials {
        return {
            username: info.username,
            password: info.password,
        };
    }

    private credentialsFromPAT(info: PATAuthInfo): Credentials {
        return {
            username: BITBUCKET_TOKEN_AUTH_USERNAME,
            password: info.token,
        };
    }
}
