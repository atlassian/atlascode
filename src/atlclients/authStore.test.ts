import { expansionCastTo } from 'testsutil';
import { Event, window } from 'vscode';

import { loggedOutEvent } from '../analytics';
import { CommandContext, setCommandContext } from '../commandContext';
import { Container } from '../container';
import { Logger } from '../logger';
import { keychain } from '../util/keychain';
import {
    AuthChangeType,
    AuthInfo,
    AuthInfoState,
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
        },
        siteManager: {
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

    const mockOAuthAuthInfo: OAuthInfo = {
        access: 'oauth-access-token',
        refresh: 'refresh-token',
        expirationDate: Date.now() + 3600000, // 1 hour in the future
        recievedAt: Date.now(),
        iat: Date.now(),
        user: { id: 'oauth-user-id', displayName: 'OAuth User', email: 'oauth@example.com', avatarUrl: '' },
        state: AuthInfoState.Valid,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        };

        // Create a new instance for each test
        credentialManager = new CredentialManager(mockAnalyticsClient);

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
            expect(Container.siteManager.removeSite).toHaveBeenCalledWith(mockJiraSite);
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
            jest.spyOn(credentialManager, 'getAuthInfo').mockResolvedValue(mockAuthInfo);

            await credentialManager.saveAuthInfo(mockJiraSite, mockAuthInfo);

            expect(Container.context.secrets.store).not.toHaveBeenCalled();
            expect(mockFireEvent).not.toHaveBeenCalled();
        });
    });

    describe('refreshAccessToken', () => {
        it('should refresh OAuth tokens', async () => {
            // Setup OAuth auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockOAuthAuthInfo);

            // Mock the refresher
            const newTokens = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                expiration: Date.now() + 7200000,
                receivedAt: Date.now(),
                iat: Date.now(),
            };

            (credentialManager as any)._refresher.getNewTokens = jest.fn().mockResolvedValue({
                tokens: newTokens,
                shouldInvalidate: false,
            });

            // Mock saveAuthInfo
            const saveAuthInfoSpy = jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();

            await credentialManager.refreshAccessToken(mockJiraSite);

            expect(saveAuthInfoSpy).toHaveBeenCalled();
            const savedAuthInfo = saveAuthInfoSpy.mock.calls[0][1] as OAuthInfo;
            expect(savedAuthInfo.access).toEqual('new-access-token');
            expect(savedAuthInfo.refresh).toEqual('new-refresh-token');
        });

        it('should invalidate auth info if refresh fails', async () => {
            // Setup OAuth auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockOAuthAuthInfo);

            // Mock the refresher to fail
            (credentialManager as any)._refresher.getNewTokens = jest.fn().mockResolvedValue({
                tokens: null,
                shouldInvalidate: true,
            });

            // Mock saveAuthInfo
            const saveAuthInfoSpy = jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();

            await credentialManager.refreshAccessToken(mockJiraSite);

            expect(saveAuthInfoSpy).toHaveBeenCalled();
            const savedAuthInfo = saveAuthInfoSpy.mock.calls[0][1];
            expect(savedAuthInfo.state).toEqual(AuthInfoState.Invalid);
        });

        it('should return undefined for non-OAuth credentials', async () => {
            // Setup non-OAuth auth info
            const memStore = (credentialManager as any)._memStore;
            const jiraStore = memStore.get(ProductJira.key);
            jiraStore.set(mockJiraSite.credentialId, mockAuthInfo);

            const result = await credentialManager.refreshAccessToken(mockJiraSite);
            expect(result).toBeUndefined();
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

    describe('deleteSecretStorageItem', () => {
        it('should delete item from secret storage', async () => {
            await credentialManager.deleteSecretStorageItem(ProductJira.key);
            expect(Container.context.secrets.delete).toHaveBeenCalledWith(ProductJira.key);
        });

        it('should handle errors gracefully', async () => {
            // Mock error
            (Container.context.secrets.delete as jest.Mock).mockRejectedValue(new Error('Test error'));

            await credentialManager.deleteSecretStorageItem(ProductJira.key);
            expect(Logger.info).toHaveBeenCalled();
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
});
