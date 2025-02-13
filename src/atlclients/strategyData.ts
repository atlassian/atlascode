import { OAuthProvider, Product, ProductBitbucket, ProductJira } from './authInfo';

export type StrategyProps = {
    /**  What does this strategy refer to? Essentially, strategy ID */
    provider: OAuthProvider;
    /** Is this for JIRA or Bitbucket? */
    product: Product;
    /**
     * Client ID of the OAuth app. Docs:
     *  - Jira: https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
     *  - Bitbucket: https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/
     */
    clientID: string;
    /**
     * Base URL for the initial authorization request
     */
    authorizationURL: string;
    /**
     * Base URL for getting access tokens
     */
    tokenURL: string;
    /**
     * Base URL for getting user profile information
     */
    profileURL: string;
    /**
     * The callback URL this strategy will supply to the OAuth provider.
     * Must be exactly as configured in the OAuth app.
     */
    callbackURL: string;
    /**
     * Base URL for the API calls. Used to
     */
    apiURL: string;

    /**
     * Present only in non-PKCE environments
     */
    clientSecret?: string;

    /**
     * Jira-only
     * Base URL for getting accessible resources
     */
    accessibleResourcesURL?: string;
    /**
     * Jira-only
     * Scope for the OAuth request, as seen in a classic Jira platform REST API authorization URL
     * (e.g. "manage:jira-project offline_access")
     * See developer.atlassian.com 3LO docs
     */
    scope?: string;
    /**
     * Jira-only
     * Additional parameters for the OAuth request
     * See developer.atlassian.com 3LO docs
     */
    authParams?: {
        /**
         * The audience parameter for the OAuth request
         */
        audience: string;
        /**
         * The prompt parameter for the OAuth request
         */
        prompt: string;
    };

    /**
     * Bitbucket-only
     * Base URL for getting user emails
     */
    emailsURL?: string;
};

/**
 * Temporary bit of logic to get remote auth config from environment.
 * It's fine if this is not set in prod - the new remote auth isn't invoked anywhere yet.
 */
type RemoteAuthConfig = {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
};

const getRemoteAuthConfig = () => {
    const DEFAULT_REMOTE_AUTH_CONFIG = {
        clientID: '',
        clientSecret: '',
        callbackURL: '',
    };

    try {
        const config = JSON.parse(process.env.ATLASCODE_REMOTE_AUTH_CONFIG || '{}') as RemoteAuthConfig;
        if (config.clientID && config.clientSecret && config.callbackURL) {
            return config;
        } else {
            return DEFAULT_REMOTE_AUTH_CONFIG;
        }
    } catch (e) {
        console.log('Failed to parse remote auth config', e);
        return DEFAULT_REMOTE_AUTH_CONFIG;
    }
};

const remoteAuthConfig = getRemoteAuthConfig();

export class OAuthStrategyData {
    static readonly JiraRemote: StrategyProps = {
        provider: OAuthProvider.JiraCloud,
        product: ProductJira,
        clientID: remoteAuthConfig.clientID,
        clientSecret: remoteAuthConfig.clientSecret,
        authorizationURL: 'https://auth.atlassian.com/authorize',
        tokenURL: 'https://auth.atlassian.com/oauth/token',
        profileURL: 'https://api.atlassian.com/me',
        accessibleResourcesURL: 'https://api.atlassian.com/oauth/token/accessible-resources',
        callbackURL: remoteAuthConfig.callbackURL,
        apiURL: 'api.atlassian.com',
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        authParams: {
            audience: 'api.atlassian.com',
            prompt: 'consent',
        },
    };

    static readonly JiraProd: StrategyProps = {
        provider: OAuthProvider.JiraCloud,
        product: ProductJira,
        clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
        clientSecret: '',
        authorizationURL: 'https://auth.atlassian.com/authorize',
        tokenURL: 'https://auth.atlassian.com/oauth/token',
        profileURL: 'https://api.atlassian.com/me',
        accessibleResourcesURL: 'https://api.atlassian.com/oauth/token/accessible-resources',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloud,
        apiURL: 'api.atlassian.com',
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        authParams: {
            audience: 'api.atlassian.com',
            prompt: 'consent',
        },
    };

    static readonly JiraStaging: StrategyProps = {
        provider: OAuthProvider.JiraCloudStaging,
        product: ProductJira,
        clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
        clientSecret: '',
        authorizationURL: 'https://auth.stg.atlassian.com/authorize',
        tokenURL: 'https://auth.stg.atlassian.com/oauth/token',
        profileURL: 'https://api.stg.atlassian.com/me',
        accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloudStaging,
        apiURL: 'api.stg.atlassian.com',
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        authParams: {
            audience: 'api.stg.atlassian.com',
            prompt: 'consent',
        },
    };

    static readonly BitbucketProd: StrategyProps = {
        provider: OAuthProvider.BitbucketCloud,
        product: ProductBitbucket,
        clientID: '3hasX42a7Ugka2FJja',
        clientSecret: 'st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S',
        authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
        tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
        profileURL: 'https://api.bitbucket.org/2.0/user',
        emailsURL: 'https://api.bitbucket.org/2.0/user/emails',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloud,
        apiURL: 'https://bitbucket.org',
    };

    static readonly BitbucketStaging = {
        provider: OAuthProvider.BitbucketCloudStaging,
        product: ProductBitbucket,
        clientID: '7jspxC7fgemuUbnWQL',
        clientSecret: 'sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD',
        authorizationURL: 'https://staging.bb-inf.net/site/oauth2/authorize',
        tokenURL: 'https://staging.bb-inf.net/site/oauth2/access_token',
        profileURL: 'https://api-staging.bb-inf.net/2.0/user',
        emailsURL: 'https://api-staging.bb-inf.net/2.0/user/emails',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloudStaging,
        apiURL: 'https://staging.bb-inf.net',
    };
}
