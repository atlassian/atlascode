import type { FieldUpdater } from '../types';

export const updateAttachment: FieldUpdater = (issue, value) => {
    issue.fields.attachment.push(value);
    issue.renderedFields.attachment.push(value);

    return issue;
};
