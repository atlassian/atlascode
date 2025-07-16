export interface JiraIssue {
    fields: Record<string, any>;
    renderedFields: Record<string, any>;
}

export type FieldUpdater = (issue: JiraIssue, value: string | object) => JiraIssue;
