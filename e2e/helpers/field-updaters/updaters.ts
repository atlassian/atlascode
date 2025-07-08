import type { FieldUpdater } from '../types';
import { updateAttachment } from './updateAttachment';
import { updateComment } from './updateComment';
import { updateDescription } from './updateDescription';

/**
 * Collection of field updaters for Jira issue fields.
 * Each updater is a function that takes an issue object and a value, then updates the issue accordingly.
 *
 * To add a new field updater:
 * 1. Create a new file updateYourField.ts
 * 2. Implement the FieldUpdater type (see types.ts)
 * 3. Import and add it to fieldUpdaters object with the field name as the key
 */
const fieldUpdaters: Record<string, FieldUpdater> = {
    attachment: updateAttachment,
    comment: updateComment,
    description: updateDescription,
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
