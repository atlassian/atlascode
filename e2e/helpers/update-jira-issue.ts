import { defaultComment } from '../mock-data/comments';
import type { DescriptionObject, FieldUpdater } from './types';

const updateAttachment: FieldUpdater = (issue, value) => {
    issue.fields.attachment.push(value);
    issue.renderedFields.attachment.push(value);

    return issue;
};

const updateComment: FieldUpdater = (issue, value: string) => {
    const comment = { ...defaultComment, body: value };

    [issue.renderedFields, issue.fields].forEach((field) => {
        field.comment.comments.push(comment);
        field.comment.total = 1;
        field.comment.maxResults = 1;
        field.comment.startAt = 0;
    });

    return issue;
};

const updateDescription: FieldUpdater = (issue, value: DescriptionObject) => {
    issue.fields.description = value.fields.description;
    issue.renderedFields.description = value.renderedFields.description;
    return issue;
};

const updateSummary: FieldUpdater = (issue, value: string) => {
    issue.renderedFields.summary = value;
    issue.fields.summary = value;

    return issue;
};

const updateLabels: FieldUpdater = (issue, value: string[]) => {
    issue.fields.labels = value;
    issue.renderedFields.labels = value;

    return issue;
};

const updateStatus: FieldUpdater = (issue, value: string) => {
    issue.fields.status.name = value;
    issue.fields.status.statusCategory.name = value;
    issue.fields.statusCategory.name = value;
    return issue;
};

/**
 * Collection of field updaters for Jira issue fields.
 * Each updater is a function that takes an issue object and a value, then updates the issue accordingly.
 *
 * To add a new field updater:
 * 1. Create a new function-updater
 * 2. Implement the FieldUpdater type (see types.ts)
 * 3. Add it to fieldUpdaters object with the field name as the key
 * 4. Use updateIssueField to update the issue in the test
 */
const fieldUpdaters: Record<string, FieldUpdater> = {
    attachment: updateAttachment,
    comment: updateComment,
    description: updateDescription,
    summary: updateSummary,
    labels: updateLabels,
    status: updateStatus,
};

export function updateIssueField(issueJson: any, updates: Record<string, any>) {
    const parsedBody = JSON.parse(issueJson.response.body);
    const updated = structuredClone(parsedBody);

    for (const [key, value] of Object.entries(updates)) {
        if (!(key in fieldUpdaters)) {
            throw new Error(`Field "${key}" is not yet added to fieldUpdaters`);
        }

        fieldUpdaters[key](updated, value);
    }

    return updated;
}
