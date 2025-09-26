import { Logger } from 'src/logger';

import { Container } from '../container';
import { BasicAuthInfo } from './authInfo';
import { fetchIssueSuggestions } from './issueBuilder';

jest.mock('../container', () => ({
    Container: {
        credentialManager: {
            findApiTokenForSite: jest.fn(),
        },
    },
}));
jest.mock('src/logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));
jest.mock('./issueBuilder', () => {
    const actual = jest.requireActual('./issueBuilder');
    return {
        ...actual,
        getAxiosInstance: jest.fn(),
    };
});

describe('fetchIssueSuggestions', () => {
    const site = {
        host: 'test.atlassian.net',
        id: 'site-id',
        name: 'Test Site',
        avatarUrl: '',
        baseLinkUrl: '',
        baseApiUrl: '',
        isCloud: true,
        userId: 'user-id',
        credentialId: 'cred-id',
        product: { name: 'Jira', key: 'jira' },
    };
    const basicAuthInfo: BasicAuthInfo = {
        username: 'user',
        password: 'pass',
        user: { email: 'test@domain.com', id: 'id', displayName: 'Test User', avatarUrl: '' },
        state: 0,
    };
    const mockAxiosInstance = {
        post: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (Container.credentialManager.findApiTokenForSite as jest.Mock).mockResolvedValue(basicAuthInfo);
        jest.spyOn(require('../jira/jira-client/providers'), 'getAxiosInstance').mockReturnValue(mockAxiosInstance);
    });

    it('returns suggested issues on success', async () => {
        const mockResponse = {
            data: {
                ai_feature_output: {
                    suggested_issues: [
                        {
                            issue_type: 'Task',
                            field_values: {
                                Summary: 'Test summary',
                                Description: 'Test description',
                            },
                        },
                    ],
                },
            },
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        const result = await fetchIssueSuggestions(site as any, 'prompt', 'context');
        expect(result.suggestedIssues).toHaveLength(1);
        expect(result.suggestedIssues[0].issueType).toBe('Task');
        expect(result.suggestedIssues[0].fieldValues.summary).toBe('Test summary');
        expect(result.suggestedIssues[0].fieldValues.description).toBe('Test description');
        expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('throws error if no valid auth info', async () => {
        (Container.credentialManager.findApiTokenForSite as jest.Mock).mockResolvedValue(undefined);
        await expect(fetchIssueSuggestions(site as any, 'prompt', 'context')).rejects.toThrow(
            'No valid auth info found for site',
        );
        expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error if no suggested issues found', async () => {
        const mockResponse = {
            data: {
                ai_feature_output: {
                    suggested_issues: [],
                },
            },
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        await expect(fetchIssueSuggestions(site as any, 'prompt', 'context')).rejects.toThrow(
            'No suggested issues found',
        );
        expect(Logger.error).toHaveBeenCalled();
    });

    it('logs and throws error on request failure', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));
        await expect(fetchIssueSuggestions(site as any, 'prompt', 'context')).rejects.toThrow('Network error');
        expect(Logger.error).toHaveBeenCalled();
    });
});
