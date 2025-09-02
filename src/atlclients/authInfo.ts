export enum AuthChangeType {
    Update = 'update',
    Remove = 'remove',
}
export interface AuthInfoEvent {
    type: AuthChangeType;
}

export interface UpdateAuthInfoEvent extends AuthInfoEvent {
    type: AuthChangeType.Update;
    site: DetailedSiteInfo;
}

export interface RemoveAuthInfoEvent extends AuthInfoEvent {
    type: AuthChangeType.Remove;
    product: Product;
    credentialId: string;
    userId: string;
}

export interface Product {
    name: string;
    key: string;
}

export const ProductJira: Product = {
    name: 'Jira',
    key: 'jira',
};

export const ProductBitbucket: Product = {
    name: 'Bitbucket',
    key: 'bitbucket',
};

export enum OAuthProvider {
    BitbucketCloud = 'bbcloud',
    BitbucketCloudStaging = 'bbcloudstaging',
    JiraCloud = 'jiracloud',
    JiraCloudStaging = 'jiracloudstaging',
    JiraCloudRemote = 'jiracloudremote',
}

export interface OAuthResponse {
    access: string;
    refresh: string;
    expirationDate?: number;
    iat?: number;
    receivedAt: number;
    user: UserInfo;
    accessibleResources: Array<AccessibleResource>;
}

export enum AuthInfoState {
    Valid,
    Invalid,
}

export interface AuthInfo {
    user: UserInfo;
    state: AuthInfoState;
}

export interface OAuthInfo extends AuthInfo {
    access: string;
    refresh: string;
    expirationDate?: number;
    iat?: number;
    recievedAt: number;
}

export interface PATAuthInfo extends AuthInfo {
    token: string;
}

export interface BasicAuthInfo extends AuthInfo {
    username: string;
    password: string;
}

export interface UserInfo {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string;
}

export interface SiteInfo {
    host: string;
    protocol?: string;
    product: Product;
    contextPath?: string;
    customSSLCertPaths?: string;
    pfxPath?: string;
    pfxPassphrase?: string;
}

export interface DetailedSiteInfo extends SiteInfo {
    id: string;
    name: string;
    avatarUrl: string;
    baseLinkUrl: string;
    baseApiUrl: string;
    isCloud: boolean;
    userId: string;
    credentialId: string;
}

// You MUST send source
// You SHOULD send both AAID and Anonymous ID when available (if only one is available, send that)
// Anonymous ID should match the ID sent to amplitude for analytics events
export interface IntegrationsLinkParams {
    aaid?: string; // Atlassian Account ID
    aid: string; // Anonymous ID
    s: string; // source
}

export interface AccessibleResource {
    id: string;
    name: string;
    scopes: Array<string>;
    avatarUrl: string;
    url: string;
}

export const emptyUserInfo: UserInfo = {
    id: '',
    displayName: '',
    email: '',
    avatarUrl: '',
};

export const emptyProduct: Product = {
    name: '',
    key: '',
};

export const emptySiteInfo: DetailedSiteInfo = {
    id: '',
    name: '',
    avatarUrl: '',
    host: '',
    baseLinkUrl: '',
    baseApiUrl: '',
    product: emptyProduct,
    isCloud: true,
    userId: '',
    credentialId: '',
};

export const emptyAuthInfo: AuthInfo = {
    user: emptyUserInfo,
    state: AuthInfoState.Valid,
};

export const emptyBasicAuthInfo: BasicAuthInfo = {
    user: emptyUserInfo,
    username: '',
    password: '',
    state: AuthInfoState.Valid,
};

export function isUpdateAuthEvent(a: AuthInfoEvent): a is UpdateAuthInfoEvent {
    return (
        a &&
        (<UpdateAuthInfoEvent>a).type === AuthChangeType.Update &&
        isDetailedSiteInfo((<UpdateAuthInfoEvent>a).site)
    );
}

export function isRemoveAuthEvent(a: AuthInfoEvent): a is RemoveAuthInfoEvent {
    return a && (<RemoveAuthInfoEvent>a).type === AuthChangeType.Remove;
}

function isDetailedSiteInfo(a: any): a is DetailedSiteInfo {
    return (
        a &&
        (<DetailedSiteInfo>a).id !== undefined &&
        (<DetailedSiteInfo>a).name !== undefined &&
        (<DetailedSiteInfo>a).host !== undefined &&
        (<DetailedSiteInfo>a).baseLinkUrl !== undefined &&
        (<DetailedSiteInfo>a).baseApiUrl !== undefined
    );
}

export function isEmptySiteInfo(a: any): boolean {
    return (
        a &&
        (<DetailedSiteInfo>a).id === '' &&
        (<DetailedSiteInfo>a).name === '' &&
        (<DetailedSiteInfo>a).host === '' &&
        (<DetailedSiteInfo>a).baseLinkUrl === '' &&
        (<DetailedSiteInfo>a).baseApiUrl === ''
    );
}

export function isOAuthInfo(a?: AuthInfo): a is OAuthInfo {
    return !!a && (<OAuthInfo>a).access !== undefined && (<OAuthInfo>a).refresh !== undefined;
}

export function isBasicAuthInfo(a?: AuthInfo): a is BasicAuthInfo {
    return !!a && (<BasicAuthInfo>a).username !== undefined && (<BasicAuthInfo>a).password !== undefined;
}

export function isPATAuthInfo(a?: AuthInfo): a is PATAuthInfo {
    return !!a && (<PATAuthInfo>a).token !== undefined;
}

export function getSecretForAuthInfo(info: AuthInfo): string {
    if (isOAuthInfo(info)) {
        return info.access + info.refresh;
    }

    if (isBasicAuthInfo(info)) {
        return info.password;
    }

    if (isPATAuthInfo(info)) {
        return info.token;
    }

    return '';
}

export function oauthProviderForSite(site: SiteInfo): OAuthProvider | undefined {
    const hostname = site.host.split(':')[0];

    if (hostname.endsWith('atlassian.net') || hostname.endsWith('jira.com')) {
        return OAuthProvider.JiraCloud;
    }

    if (hostname.endsWith('jira-dev.com')) {
        return OAuthProvider.JiraCloudStaging;
    }

    if (hostname.endsWith('bitbucket.org')) {
        return OAuthProvider.BitbucketCloud;
    }

    if (hostname.endsWith('bb-inf.net')) {
        return OAuthProvider.BitbucketCloudStaging;
    }

    return undefined;
}
