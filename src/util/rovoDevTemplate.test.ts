import { DetailedSiteInfo } from '../atlclients/authInfo';
import { createRovoDevTemplate } from './rovoDevTemplate';

describe('createRovoDevTemplate', () => {
    const mockSiteDetails: DetailedSiteInfo = {
        baseLinkUrl: 'https://test.atlassian.net',
        baseApiUrl: 'https://test.atlassian.net',
        isCloud: true,
        name: 'Test Site',
        url: 'https://test.atlassian.net',
        id: 'test-id',
        avatarUrl: 'https://test.atlassian.net/avatar.png',
        userId: 'test-user',
        credentialId: 'test-cred',
        host: 'test.atlassian.net',
        product: { name: 'Jira', key: 'jira' },
    } as DetailedSiteInfo;

    it('should create template with issue key and site URL', () => {
        const issueKey = 'ABC-123';
        const result = createRovoDevTemplate(issueKey, mockSiteDetails);

        expect(result).toBe('Please work on [ABC-123](https://test.atlassian.net/browse/ABC-123)');
    });

    it('should handle different issue key formats', () => {
        const issueKey = 'PROJ-456';
        const result = createRovoDevTemplate(issueKey, mockSiteDetails);

        expect(result).toBe('Please work on [PROJ-456](https://test.atlassian.net/browse/PROJ-456)');
    });

    it('should work with different site URLs', () => {
        const customSiteDetails: DetailedSiteInfo = {
            ...mockSiteDetails,
            baseLinkUrl: 'https://custom.company.com',
        };

        const issueKey = 'TEST-789';
        const result = createRovoDevTemplate(issueKey, customSiteDetails);

        expect(result).toBe('Please work on [TEST-789](https://custom.company.com/browse/TEST-789)');
    });

    it('should handle empty issue key', () => {
        const issueKey = '';
        const result = createRovoDevTemplate(issueKey, mockSiteDetails);

        expect(result).toBe('Please work on [](https://test.atlassian.net/browse/)');
    });
});
