import { defaultComment } from '../../fixtures/comments';
import type { FieldUpdater } from '../types';

export const updateComment: FieldUpdater = (issue, value: string) => {
    const comment = { ...defaultComment, body: value };

    issue.renderedFields.comment.comments.push(comment);
    issue.renderedFields.comment.total = 1;
    issue.renderedFields.comment.maxResults = 1;
    issue.renderedFields.comment.startAt = 0;

    return issue;
};
