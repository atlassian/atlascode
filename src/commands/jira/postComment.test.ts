import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { fetchCommentWithRenderedBody, postComment } from './postComment';

jest.mock('../../container');
jest.mock('../../analytics');
jest.mock('../../logger');

describe('postComment', () => {
    const mockSiteDetails: DetailedSiteInfo = {
        userId: 'user-123',
        id: 'site-1',
        name: 'Test Site',
        avatarUrl: 'https://example.com/avatar.png',
        baseLinkUrl: 'https://example.com',
        baseApiUrl: 'https://example.com/rest/api',
        isCloud: true,
        credentialId: 'cred-1',
        host: 'example.com',
        product: {
            name: 'JIRA',
            key: 'jira',
        },
    };

    const mockIssue: IssueKeyAndSite<DetailedSiteInfo> = {
        key: 'TEST-123',
        siteDetails: mockSiteDetails,
    };

    const mockComment: Comment = {
        id: 'comment-1',
        body: 'Test comment',
        renderedBody: '<p>Test comment</p>',
        author: {
            accountId: 'user-123',
            displayName: 'Test User',
            avatarUrls: {
                '16x16': 'https://example.com/16x16',
                '24x24': 'https://example.com/24x24',
                '32x32': 'https://example.com/32x32',
                '48x48': 'https://example.com/48x48',
            },
            active: true,
            emailAddress: 'test@example.com',
            key: 'user-123',
            self: 'https://example.com/user/123',
            timeZone: 'UTC',
        },
        created: '2023-01-01T12:00:00Z',
        updated: '2023-01-01T12:00:00Z',
        self: 'https://example.com/comment/1',
        visibility: undefined,
        jsdPublic: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup Container mocks with proper structure using Object.defineProperty
        const mockClientManager = {
            jiraClient: jest.fn(),
        };
        const mockAnalyticsClient = {
            sendTrackEvent: jest.fn(),
        };

        Object.defineProperty(Container, 'clientManager', {
            value: mockClientManager,
            writable: true,
            configurable: true,
        });

        Object.defineProperty(Container, 'analyticsClient', {
            value: mockAnalyticsClient,
            writable: true,
            configurable: true,
        });
    });

    describe('postComment', () => {
        it('should post a new comment to Cloud', async () => {
            const mockClient = {
                addComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
            (issueCommentEvent as jest.Mock).mockResolvedValue({ event: 'test' });
            (Container.analyticsClient.sendTrackEvent as jest.Mock).mockReturnValue(undefined);

            const commentBody = 'New comment';
            const result = await postComment(mockIssue, commentBody);

            expect(result).toEqual(mockComment);
            expect(mockClient.addComment).toHaveBeenCalledWith('TEST-123', commentBody, undefined);
        });

        it('should post a new comment to DC with converted string body', async () => {
            const dcSiteDetails: DetailedSiteInfo = { ...mockSiteDetails, isCloud: false };
            const dcIssue: IssueKeyAndSite<DetailedSiteInfo> = {
                ...mockIssue,
                siteDetails: dcSiteDetails,
            };

            const mockClient = {
                addComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
            (issueCommentEvent as jest.Mock).mockResolvedValue({ event: 'test' });
            (Container.analyticsClient.sendTrackEvent as jest.Mock).mockReturnValue(undefined);

            const commentBody = { type: 'doc', version: 1, content: [] };
            const result = await postComment(dcIssue, commentBody);

            expect(result).toEqual(mockComment);
            expect(mockClient.addComment).toHaveBeenCalled();
        });

        it('should update an existing comment', async () => {
            const mockClient = {
                updateComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
            (issueCommentEvent as jest.Mock).mockResolvedValue({ event: 'test' });
            (Container.analyticsClient.sendTrackEvent as jest.Mock).mockReturnValue(undefined);

            const commentBody = 'Updated comment';
            const result = await postComment(mockIssue, commentBody, 'comment-1');

            expect(result).toEqual(mockComment);
            expect(mockClient.updateComment).toHaveBeenCalledWith('TEST-123', 'comment-1', commentBody, undefined);
        });

        it('should post a comment with visibility restriction', async () => {
            const mockClient = {
                addComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
            (issueCommentEvent as jest.Mock).mockResolvedValue({ event: 'test' });
            (Container.analyticsClient.sendTrackEvent as jest.Mock).mockReturnValue(undefined);

            const commentBody = 'Restricted comment';
            const visibility: CommentVisibility = { type: 'group', value: 'jira-developers' };
            const result = await postComment(mockIssue, commentBody, undefined, visibility);

            expect(result).toEqual(mockComment);
            expect(mockClient.addComment).toHaveBeenCalledWith('TEST-123', commentBody, visibility);
        });

        it('should send an analytics event after posting a comment', async () => {
            const mockAnalyticsEvent = { event: 'issue.comment.created' };
            const mockClient = {
                addComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
            (issueCommentEvent as jest.Mock).mockResolvedValue(mockAnalyticsEvent);

            await postComment(mockIssue, 'New comment');

            expect(issueCommentEvent).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockAnalyticsEvent);
        });
    });

    describe('fetchCommentWithRenderedBody', () => {
        it('should fetch a comment with renderedBody', async () => {
            const mockClient = {
                getComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            const result = await fetchCommentWithRenderedBody(mockIssue, 'comment-1');

            expect(result).toEqual(mockComment);
            expect(mockClient.getComment).toHaveBeenCalledWith('TEST-123', 'comment-1', 'renderedBody');
        });

        it('should return comment with empty renderedBody if not provided', async () => {
            const commentWithoutRenderedBody: Comment = {
                ...mockComment,
                renderedBody: undefined,
            };

            const mockClient = {
                getComment: jest.fn().mockResolvedValue(commentWithoutRenderedBody),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            const result = await fetchCommentWithRenderedBody(mockIssue, 'comment-1');

            expect(result).toEqual(commentWithoutRenderedBody);
            expect(mockClient.getComment).toHaveBeenCalledWith('TEST-123', 'comment-1', 'renderedBody');
        });

        it('should handle errors gracefully and log them', async () => {
            const mockError = new Error('Failed to fetch comment');
            const mockClient = {
                getComment: jest.fn().mockRejectedValue(mockError),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            await expect(fetchCommentWithRenderedBody(mockIssue, 'comment-1')).rejects.toThrow(mockError);

            expect(Logger.error).toHaveBeenCalledWith(mockError, expect.stringContaining('Failed to fetch comment'));
        });

        it('should include issue key and comment ID in error message', async () => {
            const mockError = new Error('Network error');
            const mockClient = {
                getComment: jest.fn().mockRejectedValue(mockError),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            await expect(fetchCommentWithRenderedBody(mockIssue, 'comment-123')).rejects.toThrow('Network error');

            expect(Logger.error).toHaveBeenCalledWith(mockError, expect.stringContaining('comment-123'));
            expect(Logger.error).toHaveBeenCalledWith(mockError, expect.stringContaining('TEST-123'));
        });

        it('should work with different site types (Cloud)', async () => {
            const mockClient = {
                getComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            const result = await fetchCommentWithRenderedBody(mockIssue, 'comment-1');

            expect(result).toEqual(mockComment);
        });

        it('should work with different site types (DC)', async () => {
            const dcSiteDetails: DetailedSiteInfo = { ...mockSiteDetails, isCloud: false };
            const dcIssue: IssueKeyAndSite<DetailedSiteInfo> = {
                ...mockIssue,
                siteDetails: dcSiteDetails,
            };

            const mockClient = {
                getComment: jest.fn().mockResolvedValue(mockComment),
                authorizationProvider: jest.fn(),
            };

            (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);

            const result = await fetchCommentWithRenderedBody(dcIssue, 'comment-1');

            expect(result).toEqual(mockComment);
            expect(mockClient.getComment).toHaveBeenCalledWith('TEST-123', 'comment-1', 'renderedBody');
        });
    });
});
