import type { FieldUpdater } from '../types';
import { updateAttachment } from './updateAttachment';
import { updateComment } from './updateComment';
import { updateDescription } from './updateDescription';

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
