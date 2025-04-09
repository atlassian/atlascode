import { ATLASCODE_TEST_HOST } from '../../src/constants';

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
}

export interface Product {
    name: string;
    key: string;
}

export const ProductJira = {
    name: 'Jira',
    key: 'jira',
};

export const ProductBitbucket = {
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
export interface AuthInfoV1 {
    access: string;
    refresh: string;
    user: UserInfoV1;
    accessibleResources?: Array<AccessibleResourceV1>;
}

export interface UserInfoV1 {
    id: string;
    displayName: string;
    provider: OAuthProvider;
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

interface AuthInfoCommon {
    user: UserInfo;
    state: AuthInfoState;
}

export interface NoAuthInfo extends AuthInfoCommon {
    type: 'none';
}

export interface OAuthInfo extends AuthInfoCommon {
    type: 'oauth';
    access: string;
    refresh: string;
    expirationDate?: number;
    iat?: number;
    recievedAt: number;
}

export interface PATAuthInfo extends AuthInfoCommon {
    type: 'pat';
    token: string;
}

export interface BasicAuthInfo extends AuthInfoCommon {
    type: 'basic';
    username: string;
    password: string;
}

export type AuthInfo = NoAuthInfo | OAuthInfo | BasicAuthInfo | PATAuthInfo;

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
    /** Jira only -- Indicates if the site's schema contains a field named 'resolution' */
    hasResolutionField: boolean;
}

// You MUST send source
// You SHOULD send both AAID and Anonymous ID when available (if only one is available, send that)
// Anonymous ID should match the ID sent to amplitude for analytics events
export interface IntegrationsLinkParams {
    aaid?: string; // Atlassian Account ID
    aid: string; // Anonymous ID
    s: string; // source
}

export interface AccessibleResourceV1 {
    id: string;
    name: string;
    scopes: Array<string>;
    avatarUrl: string;
    baseUrlSuffix: string;
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
    hasResolutionField: false,
};

export const emptyAccessibleResource: AccessibleResource = {
    id: '',
    name: '',
    avatarUrl: '',
    scopes: [],
    url: '',
};

export const emptyAccessibleResourceV1: AccessibleResourceV1 = {
    id: '',
    name: '',
    avatarUrl: '',
    scopes: [],
    baseUrlSuffix: 'atlassian.net',
};

export const emptyAuthInfo: AuthInfo = {
    type: 'none',
    user: emptyUserInfo,
    state: AuthInfoState.Valid,
};

export const emptyBasicAuthInfo: BasicAuthInfo = {
    type: 'basic',
    user: emptyUserInfo,
    username: '',
    password: '',
    state: AuthInfoState.Valid,
};

export const emptyPATAuthInfo: PATAuthInfo = {
    type: 'pat',
    user: emptyUserInfo,
    token: '',
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

export function isDetailedSiteInfo(a: any): a is DetailedSiteInfo {
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

export function isOAuthInfo(a: AuthInfo | undefined): a is OAuthInfo {
    // This check should be retired over time when auth info is updated to use the new type
    const oldCheck = a && (<OAuthInfo>a).access !== undefined && (<OAuthInfo>a).refresh !== undefined;
    return oldCheck || (!!a && a.type === 'oauth');
}

export function isBasicAuthInfo(a: AuthInfo | undefined): a is BasicAuthInfo {
    // This check should be retired over time when auth info is updated to use the new type
    const oldCheck = a && (<BasicAuthInfo>a).username !== undefined && (<BasicAuthInfo>a).password !== undefined;
    return oldCheck || (!!a && a.type === 'basic');
}

export function isPATAuthInfo(a: AuthInfo | undefined): a is PATAuthInfo {
    // This check should be retired over time when auth info is updated to use the new type
    const oldCheck = a && (<PATAuthInfo>a).token !== undefined;
    return oldCheck || (!!a && a.type === 'pat');
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

    // Added to allow for testing flow of AXON-32
    if (hostname.endsWith(ATLASCODE_TEST_HOST)) {
        return undefined;
    }

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
