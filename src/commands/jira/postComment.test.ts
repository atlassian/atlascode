import { CommentVisibility } from '@atlassianlabs/jira-pi-common-models';

import { Container } from '../../container';
import { postComment } from './postComment';

jest.mock('../../container');
jest.mock('../../analytics');

describe('postComment', () => {
    const mockIssue = {
        key: 'TEST-1',
        siteDetails: {} as any,
    };
    const mockComment: any = {
        id: '10001',
        body: 'Posted comment',
    };

    beforeEach(() => {
        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue({
            addComment: jest.fn().mockResolvedValue(mockComment),
            updateComment: jest.fn().mockResolvedValue(mockComment),
        });
    });

    it('passes string comment body to addComment', async () => {
        const body = 'Plain text comment';
        await postComment(mockIssue, body);

        const client = await Container.clientManager.jiraClient(mockIssue.siteDetails);
        expect(client.addComment).toHaveBeenCalledWith(mockIssue.key, body, undefined);
    });

    it('normalizes ADF object to string (extracts text) before calling addComment', async () => {
        const adfBody = {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hello from ADF' }],
                },
            ],
        };

        await postComment(mockIssue, adfBody as any);

        const client = await Container.clientManager.jiraClient(mockIssue.siteDetails);
        expect(client.addComment).toHaveBeenCalledWith(mockIssue.key, 'Hello from ADF', undefined);
    });

    it('normalizes ADF object to string for updateComment', async () => {
        const adfBody = {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        { type: 'text', text: 'Updated ' },
                        { type: 'text', text: 'comment' },
                    ],
                },
            ],
        };

        await postComment(mockIssue, adfBody as any, 'comment-123');

        const client = await Container.clientManager.jiraClient(mockIssue.siteDetails);
        expect(client.updateComment).toHaveBeenCalledWith(mockIssue.key, 'comment-123', 'Updated comment', undefined);
    });

    it('passes restriction to addComment when provided', async () => {
        const restriction: CommentVisibility = { type: 'group', value: 'jira-admins' };
        await postComment(mockIssue, 'Internal note', undefined, restriction);

        const client = await Container.clientManager.jiraClient(mockIssue.siteDetails);
        expect(client.addComment).toHaveBeenCalledWith(mockIssue.key, 'Internal note', restriction);
    });
});
