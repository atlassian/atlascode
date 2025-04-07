jest.mock('./strategyCrypto', () => {
    return {
        createVerifier: jest.fn(() => 'verifier'),
        base64URLEncode: jest.fn(() => 'base64URLEncode'),
        sha256: jest.fn(() => 'sha256'),
        basicAuth: jest.fn(() => 'basicAuth'),
    };
});

// it.each is not found without this:
import { it } from '@jest/globals';

import { OAuthProvider } from './authInfo';
import { strategyForProvider } from './strategy';

const expectedData: any = {
    bbcloud: {
        provider: 'bbcloud',
        authorizeUrl:
            'https://bitbucket.org/site/oauth2/authorize?client_id=3hasX42a7Ugka2FJja&response_type=code&state=state',
        accessibleResourcesUrl: '',
        tokenAuthorizationData: 'grant_type=authorization_code&code=code',
        tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
        apiUrl: 'https://bitbucket.org',
        refreshHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'basicAuth',
        },
        tokenRefreshData: 'grant_type=refresh_token&refresh_token=refreshToken',
        profileUrl: 'https://api.bitbucket.org/2.0/user',
        emailsUrl: 'https://api.bitbucket.org/2.0/user/emails',
    },
    bbcloudstaging: {
        provider: 'bbcloudstaging',
        authorizeUrl:
            'https://staging.bb-inf.net/site/oauth2/authorize?client_id=7jspxC7fgemuUbnWQL&response_type=code&state=state',
        accessibleResourcesUrl: '',
        tokenAuthorizationData: 'grant_type=authorization_code&code=code',
        tokenUrl: 'https://staging.bb-inf.net/site/oauth2/access_token',
        apiUrl: 'https://staging.bb-inf.net',
        refreshHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'basicAuth',
        },
        tokenRefreshData: 'grant_type=refresh_token&refresh_token=refreshToken',
        profileUrl: 'https://api-staging.bb-inf.net/2.0/user',
        emailsUrl: 'https://api-staging.bb-inf.net/2.0/user/emails',
    },
    jiracloud: {
        provider: 'jiracloud',
        authorizeUrl:
            'https://auth.atlassian.com/authorize?client_id=bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2&redirect_uri=http%3A%2F%2F127.0.0.1%3A31415%2Fjiracloud&response_type=code&scope=read%3Ajira-user+read%3Ajira-work+write%3Ajira-work+offline_access+manage%3Ajira-project&audience=api.atlassian.com&prompt=consent&state=state&code_challenge=base64URLEncode&code_challenge_method=S256',
        accessibleResourcesUrl: 'https://api.atlassian.com/oauth/token/accessible-resources',
        tokenAuthorizationData:
            '{"grant_type":"authorization_code","code":"code","redirect_uri":"http://127.0.0.1:31415/jiracloud","client_id":"bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2","code_verifier":"verifier"}',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        apiUrl: 'api.atlassian.com',
        refreshHeaders: {
            'Content-Type': 'application/json',
        },
        tokenRefreshData:
            '{"grant_type":"refresh_token","client_id":"bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2","refresh_token":"refreshToken"}',
        profileUrl: 'https://api.atlassian.com/me',
        emailsUrl: '',
    },
    jiracloudstaging: {
        provider: 'jiracloudstaging',
        authorizeUrl:
            'https://auth.stg.atlassian.com/authorize?client_id=pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg&redirect_uri=http%3A%2F%2F127.0.0.1%3A31415%2Fjiracloudstaging&response_type=code&scope=read%3Ajira-user+read%3Ajira-work+write%3Ajira-work+offline_access+manage%3Ajira-project&audience=api.stg.atlassian.com&prompt=consent&state=state&code_challenge=base64URLEncode&code_challenge_method=S256',
        accessibleResourcesUrl: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
        tokenAuthorizationData:
            '{"grant_type":"authorization_code","code":"code","redirect_uri":"http://127.0.0.1:31415/jiracloudstaging","client_id":"pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg","code_verifier":"verifier"}',
        tokenUrl: 'https://auth.stg.atlassian.com/oauth/token',
        apiUrl: 'api.stg.atlassian.com',
        refreshHeaders: {
            'Content-Type': 'application/json',
        },
        tokenRefreshData:
            '{"grant_type":"refresh_token","client_id":"pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg","refresh_token":"refreshToken"}',
        profileUrl: 'https://api.stg.atlassian.com/me',
        emailsUrl: '',
    },
};

describe('Authentication strategies', () => {
    it.each([
        [OAuthProvider.BitbucketCloud],
        [OAuthProvider.BitbucketCloudStaging],
        [OAuthProvider.JiraCloud],
        [OAuthProvider.JiraCloudStaging],
    ])('Strategy for provider %s yields expected results', (provider: OAuthProvider) => {
        const expected = expectedData[provider] as any;
        const strategy = strategyForProvider(provider);
        expect(strategy.provider()).toBe(expected.provider);
        expect(strategy.authorizeUrl('state')).toBe(expected.authorizeUrl);
        expect(strategy.accessibleResourcesUrl()).toBe(expected.accessibleResourcesUrl);
        expect(strategy.tokenAuthorizationData('code')).toBe(expected.tokenAuthorizationData);
        expect(strategy.tokenUrl()).toBe(expected.tokenUrl);
        expect(strategy.apiUrl()).toBe(expected.apiUrl);
        expect(strategy.refreshHeaders()).toStrictEqual(expected.refreshHeaders);
        expect(strategy.tokenRefreshData('refreshToken')).toBe(expected.tokenRefreshData);
        expect(strategy.profileUrl()).toBe(expected.profileUrl);
        expect(strategy.emailsUrl()).toBe(expected.emailsUrl);
    });
});
