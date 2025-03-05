import { JiraAuthentictor } from './jiraAuthenticator';
import { OAuthProvider, AccessibleResource, ProductJira } from './authInfo';
import { CredentialManager } from './authStore';
import { Container } from '../container';

jest.mock('./authStore');
jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
    },
}));

describe('JiraAuthenticator', () => {
    it('should return site details for given resources', async () => {
        const provider = OAuthProvider.JiraCloud;
        const userId = 'user123';
        const resources: AccessibleResource[] = [
            {
                id: 'resource1',
                name: 'Resource 1',
                url: 'https://resource1.atlassian.net',
                avatarUrl: 'https://resource1.atlassian.net/avatar.png',
                scopes: [],
            },
        ];

        const mockClient = {
            getFields: jest.fn().mockResolvedValue([{ id: 'resolution' }]),
        };

        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
        (CredentialManager.generateCredentialId as jest.Mock).mockReturnValue('credential123');

        const authenticator = new JiraAuthentictor();
        const result = await authenticator.getOAuthSiteDetails(provider, userId, resources);

        expect(result).toEqual([
            {
                avatarUrl: 'https://resource1.atlassian.net/avatar.png',
                baseApiUrl: 'https://api.atlassian.com/ex/jira/resource1/rest',
                baseLinkUrl: 'https://resource1.atlassian.net',
                host: 'resource1.atlassian.net',
                id: 'resource1',
                name: 'Resource 1',
                product: ProductJira,
                isCloud: true,
                userId: 'user123',
                credentialId: 'credential123',
                hasResolutionField: true,
            },
        ]);
    });

    it('should handle resources without resolution field', async () => {
        const provider = OAuthProvider.JiraCloud;
        const userId = 'user123';
        const resources: AccessibleResource[] = [
            {
                id: 'resource2',
                name: 'Resource 2',
                url: 'https://resource2.atlassian.net',
                avatarUrl: 'https://resource2.atlassian.net/avatar.png',
                scopes: [],
            },
        ];

        const mockClient = {
            getFields: jest.fn().mockResolvedValue([{ id: 'someOtherField' }]),
        };

        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
        (CredentialManager.generateCredentialId as jest.Mock).mockReturnValue('credential456');

        const authenticator = new JiraAuthentictor();
        const result = await authenticator.getOAuthSiteDetails(provider, userId, resources);

        expect(result).toEqual([
            {
                avatarUrl: 'https://resource2.atlassian.net/avatar.png',
                baseApiUrl: 'https://api.atlassian.com/ex/jira/resource2/rest',
                baseLinkUrl: 'https://resource2.atlassian.net',
                host: 'resource2.atlassian.net',
                id: 'resource2',
                name: 'Resource 2',
                product: ProductJira,
                isCloud: true,
                userId: 'user123',
                credentialId: 'credential456',
                hasResolutionField: false,
            },
        ]);
    });
});
