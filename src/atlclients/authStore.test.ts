import { expansionCastTo } from 'testsutil';
import { Event, window } from 'vscode';

import { loggedOutEvent } from '../analytics';
import { CommandContext, setCommandContext } from '../commandContext';
import { Container } from '../container';
import { keychain } from '../util/keychain';
import { Time } from '../util/time';
import {
    AuthChangeType,
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthInfo,
    ProductBitbucket,
    ProductJira,
} from './authInfo';
import { CredentialManager } from './authStore';

class CryptoHashMock {
    private readonly algorithm: string;
    private data = '';
    constructor(algorithm: string) {
        this.algorithm = algorithm;
    }
    public update(data: string) {
        this.data += data;
        return this;
    }
    public digest() {
        return `${this.algorithm}: ${this.data}`;
    }
}

// Mock dependencies
jest.mock('../container', () => ({
    Container: {
        context: {
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        },
        siteManager: {
            getSitesAvailable: jest.fn(),
            getSiteForId: jest.fn(),
            removeSite: jest.fn(),
        },
        clientManager: {
            removeClient: jest.fn(),
        },
    },
}));

jest.mock('../logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../util/keychain', () => ({
    keychain: {
        getPassword: jest.fn(),
        deletePassword: jest.fn(),
    },
}));

jest.mock('../commandContext', () => ({
    CommandContext: {
        IsJiraAuthenticated: 'isJiraAuthenticated',
        IsBBAuthenticated: 'isBBAuthenticated',
    },
    setCommandContext: jest.fn(),
}));

jest.mock('../analytics', () => ({
    loggedOutEvent: jest.fn().mockResolvedValue({}),
}));

jest.mock('./oauthRefresher', () => ({
    OAuthRefesher: jest.fn().mockImplementation(() => ({
        getNewTokens: jest.fn(),
    })),
}));

jest.mock('crypto', () => ({
    default: {
        createHash: (algorithm: string) => new CryptoHashMock(algorithm),
    },
}));

describe('CredentialManager', () => {
    let credentialManager: CredentialManager;
    let mockAnalyticsClient: any;

    const keychainGetPasswordMock: jest.Mock = keychain!.getPassword as any;
    const keychainDeletePasswordMock: jest.Mock = keychain!.deletePassword as any;

    const mockFireEvent = jest.fn();

    const mockJiraSite = expansionCastTo<DetailedSiteInfo>({
        id: 'jira-site-id',
        name: 'Jira Site',
        product: ProductJira,
        baseApiUrl: 'https://jest.atlassian.net/api',
        baseLinkUrl: 'https://jest.atlassian.net',
        credentialId: 'jira-credential-id',
        host: 'jest.atlassian.net',
    });

    const mockAuthInfo: AuthInfo = {
        user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
        state: AuthInfoState.Valid,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        };

        // Create a new instance for each test
        credentialManager = new CredentialManager(Container.context, mockAnalyticsClient);

        // Mock the event emitter
        (credentialManager as any)._onDidAuthChange = {
            fire: mockFireEvent,
            event: jest.fn() as unknown as Event<any>,
            dispose: jest.fn(),
        };
    });

    describe('constructor', () => {
        it('should initialize memory store', () => {
            expect((credentialManager as any)._memStore.has(ProductJira.key)).toBeTruthy();
            expect((credentialManager as any)._memStore.has(ProductBitbucket.key)).toBeTruthy();
        });
    });

    describe('dispose', () => {
        it('should clear memory store and dispose event emitter', () => {
            const memStore = (credentialManager as any)._memStore;
            const eventEmitter = (credentialManager as any)._onDidAuthChange;

            // Add some data to memory store
            memStore.get(ProductJira.key).set('test-id', mockAuthInfo);

            // Verify data exists before dispose
            expect(memStore.get(ProductJira.key).size).toBe(1);

            credentialManager.dispose();

            // After dispose, the clear() method should have been called
            expect(eventEmitter.dispose).toHaveBeenCalled();
        });
    });

    describe('getAuthInfo', () => {
        it('should return auth info from memory store if available', async () => {
            // Setup memory store with auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockAuthInfo);

            const result = await credentialManager.getAuthInfo(mockJiraSite);
            expect(result).toEqual(mockAuthInfo);
        });

        it('should fetch auth info from secret storage if not in memory', async () => {
            // Mock secret storage return
            const mockJsonAuthInfo = JSON.stringify(mockAuthInfo);
            (Container.context.secrets.get as jest.Mock).mockResolvedValue(mockJsonAuthInfo);

            const result = await credentialManager.getAuthInfo(mockJiraSite);

            expect(Container.context.secrets.get).toHaveBeenCalledWith(
                `${mockJiraSite.product.key}-${mockJiraSite.credentialId}`,
            );
            expect(result).toEqual(mockAuthInfo);
        });

        it('should attempt migration from keychain if secret storage has no data', async () => {
            // Mock empty secret storage and keychain with data
            (Container.context.secrets.get as jest.Mock).mockResolvedValue(null);
            keychainGetPasswordMock.mockResolvedValue(JSON.stringify(mockAuthInfo));

            const result = await credentialManager.getAuthInfo(mockJiraSite);

            expect(keychainGetPasswordMock).toHaveBeenCalled();
            expect(Container.context.secrets.store).toHaveBeenCalled();
            expect(keychainDeletePasswordMock).toHaveBeenCalled();
            expect(result).toEqual(mockAuthInfo);
        });

        it('should remove dead sites if no auth info found', async () => {
            // Mock empty storages
            (Container.context.secrets.get as jest.Mock).mockResolvedValue(null);
            keychainGetPasswordMock.mockResolvedValue(null);
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(mockJiraSite);

            await credentialManager.getAuthInfo(mockJiraSite);

            expect(Container.clientManager.removeClient).toHaveBeenCalledWith(mockJiraSite);
            expect(Container.siteManager.removeSite).toHaveBeenCalledWith(mockJiraSite, false, false);
        });

        it('should return non-OAuth auth info without token refresh', async () => {
            const nonOAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
            };

            (Container.context.secrets.get as jest.Mock).mockResolvedValue(JSON.stringify(nonOAuthInfo));

            const result = await credentialManager.getAuthInfo(mockJiraSite);

            expect(result).toEqual(nonOAuthInfo);
        });

        it('should return OAuth info without refresh when token has plenty of time remaining', async () => {
            const futureExpirationTime = Date.now() + 20 * Time.MINUTES; // Well beyond grace period
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: 'access-token',
                refresh: 'refresh-token',
                expirationDate: futureExpirationTime,
                recievedAt: Date.now(),
            };

            (Container.context.secrets.get as jest.Mock).mockResolvedValue(JSON.stringify(oauthInfo));

            const result = await credentialManager.getAuthInfo(mockJiraSite);

            expect(result).toEqual(oauthInfo);
        });

        it('should handle OAuth info without expiration date by attempting refresh', async () => {
            const oauthInfoNoExpiration: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: 'access-token',
                refresh: 'refresh-token',
                recievedAt: Date.now(),
            };

            // Mock initial fetch from secret storage
            (Container.context.secrets.get as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify(oauthInfoNoExpiration))
                .mockResolvedValueOnce(
                    JSON.stringify({ ...oauthInfoNoExpiration, expirationDate: Date.now() + Time.HOURS }),
                );

            // Mock negotiator behavior - this process is not responsible
            const mockNegotiatorGet = jest.fn().mockReturnValue(false);
            const mockNegotiatorSet = jest.fn();
            const mockNegotiatorRequest = jest.fn().mockResolvedValue(undefined);
            (Container.context.globalState.get as jest.Mock).mockImplementation(mockNegotiatorGet);
            (Container.context.globalState.update as jest.Mock).mockImplementation(mockNegotiatorSet);

            // Mock the negotiator's request method
            const mockNegotiator = {
                thisIsTheResponsibleProcess: () => false,
                requestTokenRefreshForSite: mockNegotiatorRequest,
            };
            Object.defineProperty(credentialManager, 'negotiator', {
                get: () => mockNegotiator,
                configurable: true,
            });

            // Mock setTimeout to resolve immediately
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = jest.fn().mockImplementation((callback) => callback()) as any;

            const result = await credentialManager.getAuthInfo(mockJiraSite);

            expect(mockNegotiatorRequest).toHaveBeenCalledWith(JSON.stringify(mockJiraSite));
            expect(result).toEqual(
                expect.objectContaining({
                    ...oauthInfoNoExpiration,
                    expirationDate: expect.any(Number),
                }),
            );

            global.setTimeout = originalSetTimeout;
        });
    });

    describe('saveAuthInfo', () => {
        it('should save auth info to memory and secret storage', async () => {
            await credentialManager.saveAuthInfo(mockJiraSite, mockAuthInfo);

            // Verify memory store
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            expect(jiraStore.get(mockJiraSite.credentialId)).toEqual(mockAuthInfo);

            // Verify secret storage
            expect(Container.context.secrets.store).toHaveBeenCalledWith(
                `${mockJiraSite.product.key}-${mockJiraSite.credentialId}`,
                JSON.stringify(mockAuthInfo),
            );

            // Verify command context was set
            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.IsJiraAuthenticated, true);

            // Verify event was fired
            expect(mockFireEvent).toHaveBeenCalledWith({
                type: AuthChangeType.Update,
                site: mockJiraSite,
            });
        });

        it("should not save to secret storage if auth info hasn't changed", async () => {
            // Setup existing auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockAuthInfo);

            // Mock getAuthInfo to return the existing info
            jest.spyOn(credentialManager as any, 'getAuthInfoForProductAndCredentialId').mockResolvedValue(
                mockAuthInfo,
            );

            await credentialManager.saveAuthInfo(mockJiraSite, mockAuthInfo);

            expect(Container.context.secrets.store).not.toHaveBeenCalled();
            expect(mockFireEvent).not.toHaveBeenCalled();
        });

        it('should extract expiration date from JWT token when saving OAuth info', async () => {
            // Create a valid JWT token with expiration
            const expTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now in seconds
            const payload = { exp: expTimestamp, iat: Math.floor(Date.now() / 1000) };
            const header = { alg: 'HS256', typ: 'JWT' };

            const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const signature = 'signature';
            const jwtToken = `${encodedHeader}.${encodedPayload}.${signature}`;

            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: jwtToken,
                refresh: 'refresh-token',
                recievedAt: Date.now(),
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            // Verify that the saved info has the expiration date extracted from JWT
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(expTimestamp * 1000);
        });

        it('should handle JWT token without expiration claim', async () => {
            const payload = { iat: Math.floor(Date.now() / 1000), sub: 'user-id' };
            const header = { alg: 'HS256', typ: 'JWT' };

            const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const signature = 'signature';
            const jwtToken = `${encodedHeader}.${encodedPayload}.${signature}`;

            const baseTime = Date.now();
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: jwtToken,
                refresh: 'refresh-token',
                recievedAt: baseTime,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            // Should fall back to using recievedAt + 1 hour
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(baseTime + Time.HOURS);
        });

        it('should handle invalid JWT token format', async () => {
            const baseTime = Date.now();
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: 'invalid-jwt-format', // Not a valid JWT
                refresh: 'refresh-token',
                recievedAt: baseTime,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            // Should fall back to using recievedAt + 1 hour
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(baseTime + Time.HOURS);
        });

        it('should handle JWT with malformed payload', async () => {
            const encodedHeader = Buffer.from('{"alg":"HS256"}').toString('base64');
            const invalidJsonPayload = Buffer.from('invalid-json').toString('base64');
            const signature = 'signature';
            const jwtToken = `${encodedHeader}.${invalidJsonPayload}.${signature}`;

            const baseTime = Date.now();
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: jwtToken,
                refresh: 'refresh-token',
                recievedAt: baseTime,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            // Should fall back to using recievedAt + 1 hour
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(baseTime + Time.HOURS);
        });

        it('should prefer iat time over recievedAt for fallback expiration', async () => {
            const iatTime = Date.now() - 30 * Time.MINUTES;
            const receivedTime = Date.now();

            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: 'invalid-jwt-token',
                refresh: 'refresh-token',
                iat: iatTime,
                recievedAt: receivedTime,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(iatTime + Time.HOURS);
        });

        it('should not overwrite existing expiration date', async () => {
            const existingExpiration = Date.now() + 2 * Time.HOURS;
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: 'any-token',
                refresh: 'refresh-token',
                expirationDate: existingExpiration,
                recievedAt: Date.now(),
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(existingExpiration);
        });

        it('should handle JWT with zero exp value', async () => {
            const payload = { exp: 0, iat: Math.floor(Date.now() / 1000) };
            const header = { alg: 'HS256', typ: 'JWT' };

            const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const signature = 'signature';
            const jwtToken = `${encodedHeader}.${encodedPayload}.${signature}`;

            const baseTime = Date.now();
            const oauthInfo: OAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
                access: jwtToken,
                refresh: 'refresh-token',
                recievedAt: baseTime,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, oauthInfo);

            // Should fall back to using recievedAt + 1 hour when exp is 0
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo.expirationDate).toBe(baseTime + Time.HOURS);
        });

        it('should not modify non-OAuth auth info', async () => {
            const nonOAuthInfo = {
                user: { id: 'user-id', displayName: 'User Name', email: 'user@example.com', avatarUrl: '' },
                state: AuthInfoState.Valid,
            };

            await credentialManager.saveAuthInfo(mockJiraSite, nonOAuthInfo);

            // Verify that non-OAuth info is saved without modification
            const savedInfoCall = (Container.context.secrets.store as jest.Mock).mock.calls[0];
            const savedInfo = JSON.parse(savedInfoCall[1]);
            expect(savedInfo).toEqual(nonOAuthInfo);
            expect(savedInfo.expirationDate).toBeUndefined();
        });
    });

    describe('removeAuthInfo', () => {
        it('should remove auth info from memory and secret storage', async () => {
            // Setup memory store with auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockAuthInfo);

            // Mock secret storage to return success
            (Container.context.secrets.get as jest.Mock).mockResolvedValue(JSON.stringify(mockAuthInfo));
            (Container.context.secrets.delete as jest.Mock).mockResolvedValue(undefined);

            // Mock analytics
            (loggedOutEvent as jest.Mock).mockResolvedValue({});

            const result = await credentialManager.removeAuthInfo(mockJiraSite);

            // Verify memory store
            expect(jiraStore.has(mockJiraSite.credentialId)).toBeFalsy();

            // Verify secret storage
            expect(Container.context.secrets.delete).toHaveBeenCalledWith(
                `${mockJiraSite.product.key}-${mockJiraSite.credentialId}`,
            );

            // Verify command context was unset
            expect(setCommandContext).toHaveBeenCalledWith(CommandContext.IsJiraAuthenticated, false);

            // Verify event was fired
            expect(mockFireEvent).toHaveBeenCalledWith({
                type: AuthChangeType.Remove,
                product: mockJiraSite.product,
                credentialId: mockJiraSite.credentialId,
                userId: mockAuthInfo.user.id,
            });

            // Verify info message was shown
            expect(window.showInformationMessage).toHaveBeenCalledWith(
                `You have been logged out of ${mockJiraSite.product.name}: ${mockJiraSite.name}`,
            );

            // Verify analytics event
            expect(loggedOutEvent).toHaveBeenCalledWith(mockJiraSite);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalled();

            // Verify return value
            expect(result).toBeTruthy();
        });

        it('should return false if no auth info was found', async () => {
            // Setup empty memory store
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.clear();

            // Mock empty secret storage
            (Container.context.secrets.get as jest.Mock).mockResolvedValue(null);

            const result = await credentialManager.removeAuthInfo(mockJiraSite);
            expect(result).toBeFalsy();
        });
    });

    describe('static methods', () => {
        it('generateCredentialId should create consistent hash', () => {
            const id1 = CredentialManager.generateCredentialId('site1', 'user1');
            const id2 = CredentialManager.generateCredentialId('site1', 'user1');
            const id3 = CredentialManager.generateCredentialId('site2', 'user1');

            expect(id1).toEqual(id2);
            expect(id1).not.toEqual(id3);
        });
    });

    describe('findApiTokenForSite', () => {
        const basicAuthInfo: BasicAuthInfo = {
            username: 'user',
            password: 'pass',
            user: { email: 'test@domain.com', id: 'id', displayName: 'Test User', avatarUrl: '' },
            state: AuthInfoState.Valid,
        };

        const makeSite = (host: string, email: string): any => ({
            host,
            id: 'site-id',
            name: 'Test Site',
            avatarUrl: '',
            baseLinkUrl: '',
            product: 'jira',
            user: { email, id: 'id', displayName: 'Test User', avatarUrl: '' },
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('returns undefined if site is not found', async () => {
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(undefined);
            const result = await credentialManager.findApiTokenForSite('site-id');
            expect(result).toBeUndefined();
        });

        it('returns undefined if site host is not .atlassian.net', async () => {
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(
                makeSite('example.com', 'test@domain.com'),
            );
            const result = await credentialManager.findApiTokenForSite('site-id');
            expect(result).toBeUndefined();
        });

        it('returns undefined if no matching authInfo found', async () => {
            const site = makeSite('test.atlassian.net', 'a@b.com');
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(site);
            (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
            credentialManager.getAuthInfo = jest
                .fn()
                .mockResolvedValueOnce({
                    user: { email: 'a@b.com', id: 'id', displayName: '', avatarUrl: '' },
                })
                .mockResolvedValueOnce(undefined);
            const result = await credentialManager.findApiTokenForSite('site-id');
            expect(result).toBeUndefined();
        });

        it('returns BasicAuthInfo if matching site and authInfo found', async () => {
            const site = makeSite('test.atlassian.net', 'test@domain.com');
            (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(site);
            (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
            // First call returns an object with a user property, second returns BasicAuthInfo
            credentialManager.getAuthInfo = jest
                .fn()
                .mockResolvedValueOnce({ user: site.user })
                .mockResolvedValueOnce(basicAuthInfo);
            const result = await credentialManager.findApiTokenForSite('site-id');
            expect(result).toEqual(basicAuthInfo);
        });

        it('works when site is passed as DetailedSiteInfo', async () => {
            const site = makeSite('test.atlassian.net', 'test@domain.com');
            (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
            credentialManager.getAuthInfo = jest
                .fn()
                .mockResolvedValueOnce({ user: site.user })
                .mockResolvedValueOnce(basicAuthInfo);
            const result = await credentialManager.findApiTokenForSite(site);
            expect(result).toEqual(basicAuthInfo);
        });
    });
});
