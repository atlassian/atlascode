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
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project manage:jira-configuration manage:jira-webhook read:application-role:jira read:audit-log:jira read:avatar:jira write:avatar:jira delete:avatar:jira read:project.avatar:jira write:project.avatar:jira delete:project.avatar:jira read:dashboard:jira write:dashboard:jira delete:dashboard:jira read:dashboard.property:jira write:dashboard.property:jira delete:dashboard.property:jira read:filter:jira write:filter:jira delete:filter:jira read:filter.column:jira write:filter.column:jira delete:filter.column:jira read:filter.default-share-scope:jira write:filter.default-share-scope:jira read:group:jira write:group:jira delete:group:jira read:license:jira read:issue:jira write:issue:jira delete:issue:jira read:issue-meta:jira send:notification:jira read:attachment:jira write:attachment:jira delete:attachment:jira read:comment:jira write:comment:jira delete:comment:jira read:comment.property:jira write:comment.property:jira delete:comment.property:jira read:field:jira write:field:jira delete:field:jira read:field.default-value:jira write:field.default-value:jira read:field.option:jira write:field.option:jira delete:field.option:jira read:field-configuration-scheme:jira write:field-configuration-scheme:jira delete:field-configuration-scheme:jira read:custom-field-contextual-configuration:jira write:custom-field-contextual-configuration:jira read:field-configuration:jira write:field-configuration:jira delete:field-configuration:jira read:field.options:jira read:issue-link:jira write:issue-link:jira delete:issue-link:jira read:issue-link-type:jira write:issue-link-type:jira delete:issue-link-type:jira read:notification-scheme:jira read:priority:jira read:issue.property:jira write:issue.property:jira delete:issue.property:jira read:issue.remote-link:jira write:issue.remote-link:jira delete:issue.remote-link:jira read:resolution:jira read:issue-details:jira read:issue-security-scheme:jira read:issue-type:jira write:issue-type:jira delete:issue-type:jira read:issue-type-scheme:jira write:issue-type-scheme:jira delete:issue-type-scheme:jira read:issue-type-screen-scheme:jira write:issue-type-screen-scheme:jira delete:issue-type-screen-scheme:jira read:issue-type.property:jira write:issue-type.property:jira delete:issue-type.property:jira read:issue.watcher:jira write:issue.watcher:jira read:issue-worklog:jira write:issue-worklog:jira delete:issue-worklog:jira read:issue-worklog.property:jira write:issue-worklog.property:jira delete:issue-worklog.property:jira read:issue-field-values:jira read:issue-security-level:jira read:issue-status:jira read:issue-type-hierarchy:jira read:issue-type-transition:jira read:issue.changelog:jira read:issue.transition:jira write:issue.vote:jira read:issue-event:jira read:jira-expressions:jira read:user:jira read:user.columns:jira read:label:jira read:permission:jira write:permission:jira delete:permission:jira read:permission-scheme:jira write:permission-scheme:jira delete:permission-scheme:jira read:project:jira write:project:jira delete:project:jira read:project-category:jira write:project-category:jira delete:project-category:jira read:project.component:jira write:project.component:jira delete:project.component:jira read:project.property:jira write:project.property:jira delete:project.property:jira read:project-role:jira write:project-role:jira delete:project-role:jira read:project-version:jira write:project-version:jira delete:project-version:jira read:project.feature:jira write:project.feature:jira read:screen:jira write:screen:jira delete:screen:jira read:screen-scheme:jira write:screen-scheme:jira delete:screen-scheme:jira read:screen-field:jira read:screen-tab:jira write:screen-tab:jira delete:screen-tab:jira read:screenable-field:jira write:screenable-field:jira delete:screenable-field:jira read:issue.time-tracking:jira write:issue.time-tracking:jira read:user.property:jira write:user.property:jira delete:user.property:jira read:webhook:jira write:webhook:jira delete:webhook:jira read:workflow:jira write:workflow:jira delete:workflow:jira read:workflow-scheme:jira write:workflow-scheme:jira delete:workflow-scheme:jira read:status:jira read:workflow.property:jira write:workflow.property:jira delete:workflow.property:jira delete:async-task:jira read:instance-configuration:jira write:instance-configuration:jira read:jql:jira validate:jql:jira read:project-type:jira read:project.email:jira write:project.email:jira read:role:jira read:user-configuration:jira write:user-configuration:jira delete:user-configuration:jira read:email-address:jira',
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
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project manage:jira-configuration manage:jira-webhook read:application-role:jira read:audit-log:jira read:avatar:jira write:avatar:jira delete:avatar:jira read:project.avatar:jira write:project.avatar:jira delete:project.avatar:jira read:dashboard:jira write:dashboard:jira delete:dashboard:jira read:dashboard.property:jira write:dashboard.property:jira delete:dashboard.property:jira read:filter:jira write:filter:jira delete:filter:jira read:filter.column:jira write:filter.column:jira delete:filter.column:jira read:filter.default-share-scope:jira write:filter.default-share-scope:jira read:group:jira write:group:jira delete:group:jira read:license:jira read:issue:jira write:issue:jira delete:issue:jira read:issue-meta:jira send:notification:jira read:attachment:jira write:attachment:jira delete:attachment:jira read:comment:jira write:comment:jira delete:comment:jira read:comment.property:jira write:comment.property:jira delete:comment.property:jira read:field:jira write:field:jira delete:field:jira read:field.default-value:jira write:field.default-value:jira read:field.option:jira write:field.option:jira delete:field.option:jira read:field-configuration-scheme:jira write:field-configuration-scheme:jira delete:field-configuration-scheme:jira read:custom-field-contextual-configuration:jira write:custom-field-contextual-configuration:jira read:field-configuration:jira write:field-configuration:jira delete:field-configuration:jira read:field.options:jira read:issue-link:jira write:issue-link:jira delete:issue-link:jira read:issue-link-type:jira write:issue-link-type:jira delete:issue-link-type:jira read:notification-scheme:jira read:priority:jira read:issue.property:jira write:issue.property:jira delete:issue.property:jira read:issue.remote-link:jira write:issue.remote-link:jira delete:issue.remote-link:jira read:resolution:jira read:issue-details:jira read:issue-security-scheme:jira read:issue-type:jira write:issue-type:jira delete:issue-type:jira read:issue-type-scheme:jira write:issue-type-scheme:jira delete:issue-type-scheme:jira read:issue-type-screen-scheme:jira write:issue-type-screen-scheme:jira delete:issue-type-screen-scheme:jira read:issue-type.property:jira write:issue-type.property:jira delete:issue-type.property:jira read:issue.watcher:jira write:issue.watcher:jira read:issue-worklog:jira write:issue-worklog:jira delete:issue-worklog:jira read:issue-worklog.property:jira write:issue-worklog.property:jira delete:issue-worklog.property:jira read:issue-field-values:jira read:issue-security-level:jira read:issue-status:jira read:issue-type-hierarchy:jira read:issue-type-transition:jira read:issue.changelog:jira read:issue.transition:jira write:issue.vote:jira read:issue-event:jira read:jira-expressions:jira read:user:jira read:user.columns:jira read:label:jira read:permission:jira write:permission:jira delete:permission:jira read:permission-scheme:jira write:permission-scheme:jira delete:permission-scheme:jira read:project:jira write:project:jira delete:project:jira read:project-category:jira write:project-category:jira delete:project-category:jira read:project.component:jira write:project.component:jira delete:project.component:jira read:project.property:jira write:project.property:jira delete:project.property:jira read:project-role:jira write:project-role:jira delete:project-role:jira read:project-version:jira write:project-version:jira delete:project-version:jira read:project.feature:jira write:project.feature:jira read:screen:jira write:screen:jira delete:screen:jira read:screen-scheme:jira write:screen-scheme:jira delete:screen-scheme:jira read:screen-field:jira read:screen-tab:jira write:screen-tab:jira delete:screen-tab:jira read:screenable-field:jira write:screenable-field:jira delete:screenable-field:jira read:issue.time-tracking:jira write:issue.time-tracking:jira read:user.property:jira write:user.property:jira delete:user.property:jira read:webhook:jira write:webhook:jira delete:webhook:jira read:workflow:jira write:workflow:jira delete:workflow:jira read:workflow-scheme:jira write:workflow-scheme:jira delete:workflow-scheme:jira read:status:jira read:workflow.property:jira write:workflow.property:jira delete:workflow.property:jira delete:async-task:jira read:instance-configuration:jira write:instance-configuration:jira read:jql:jira validate:jql:jira read:project-type:jira read:project.email:jira write:project.email:jira read:role:jira read:user-configuration:jira write:user-configuration:jira delete:user-configuration:jira read:email-address:jira',
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
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project manage:jira-configuration manage:jira-webhook read:application-role:jira read:audit-log:jira read:avatar:jira write:avatar:jira delete:avatar:jira read:project.avatar:jira write:project.avatar:jira delete:project.avatar:jira read:dashboard:jira write:dashboard:jira delete:dashboard:jira read:dashboard.property:jira write:dashboard.property:jira delete:dashboard.property:jira read:filter:jira write:filter:jira delete:filter:jira read:filter.column:jira write:filter.column:jira delete:filter.column:jira read:filter.default-share-scope:jira write:filter.default-share-scope:jira read:group:jira write:group:jira delete:group:jira read:license:jira read:issue:jira write:issue:jira delete:issue:jira read:issue-meta:jira send:notification:jira read:attachment:jira write:attachment:jira delete:attachment:jira read:comment:jira write:comment:jira delete:comment:jira read:comment.property:jira write:comment.property:jira delete:comment.property:jira read:field:jira write:field:jira delete:field:jira read:field.default-value:jira write:field.default-value:jira read:field.option:jira write:field.option:jira delete:field.option:jira read:field-configuration-scheme:jira write:field-configuration-scheme:jira delete:field-configuration-scheme:jira read:custom-field-contextual-configuration:jira write:custom-field-contextual-configuration:jira read:field-configuration:jira write:field-configuration:jira delete:field-configuration:jira read:field.options:jira read:issue-link:jira write:issue-link:jira delete:issue-link:jira read:issue-link-type:jira write:issue-link-type:jira delete:issue-link-type:jira read:notification-scheme:jira read:priority:jira read:issue.property:jira write:issue.property:jira delete:issue.property:jira read:issue.remote-link:jira write:issue.remote-link:jira delete:issue.remote-link:jira read:resolution:jira read:issue-details:jira read:issue-security-scheme:jira read:issue-type:jira write:issue-type:jira delete:issue-type:jira read:issue-type-scheme:jira write:issue-type-scheme:jira delete:issue-type-scheme:jira read:issue-type-screen-scheme:jira write:issue-type-screen-scheme:jira delete:issue-type-screen-scheme:jira read:issue-type.property:jira write:issue-type.property:jira delete:issue-type.property:jira read:issue.watcher:jira write:issue.watcher:jira read:issue-worklog:jira write:issue-worklog:jira delete:issue-worklog:jira read:issue-worklog.property:jira write:issue-worklog.property:jira delete:issue-worklog.property:jira read:issue-field-values:jira read:issue-security-level:jira read:issue-status:jira read:issue-type-hierarchy:jira read:issue-type-transition:jira read:issue.changelog:jira read:issue.transition:jira write:issue.vote:jira read:issue-event:jira read:jira-expressions:jira read:user:jira read:user.columns:jira read:label:jira read:permission:jira write:permission:jira delete:permission:jira read:permission-scheme:jira write:permission-scheme:jira delete:permission-scheme:jira read:project:jira write:project:jira delete:project:jira read:project-category:jira write:project-category:jira delete:project-category:jira read:project.component:jira write:project.component:jira delete:project.component:jira read:project.property:jira write:project.property:jira delete:project.property:jira read:project-role:jira write:project-role:jira delete:project-role:jira read:project-version:jira write:project-version:jira delete:project-version:jira read:project.feature:jira write:project.feature:jira read:screen:jira write:screen:jira delete:screen:jira read:screen-scheme:jira write:screen-scheme:jira delete:screen-scheme:jira read:screen-field:jira read:screen-tab:jira write:screen-tab:jira delete:screen-tab:jira read:screenable-field:jira write:screenable-field:jira delete:screenable-field:jira read:issue.time-tracking:jira write:issue.time-tracking:jira read:user.property:jira write:user.property:jira delete:user.property:jira read:webhook:jira write:webhook:jira delete:webhook:jira read:workflow:jira write:workflow:jira delete:workflow:jira read:workflow-scheme:jira write:workflow-scheme:jira delete:workflow-scheme:jira read:status:jira read:workflow.property:jira write:workflow.property:jira delete:workflow.property:jira delete:async-task:jira read:instance-configuration:jira write:instance-configuration:jira read:jql:jira validate:jql:jira read:project-type:jira read:project.email:jira write:project.email:jira read:role:jira read:user-configuration:jira write:user-configuration:jira delete:user-configuration:jira read:email-address:jira',
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
