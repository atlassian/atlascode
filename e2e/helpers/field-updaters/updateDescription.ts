import type { FieldUpdater } from '../types';

export const updateDescription: FieldUpdater = (issue, value: string) => {
    issue.renderedFields.description = `<p>${value}</p>`;
    issue.fields.description = value;

    return issue;
};
