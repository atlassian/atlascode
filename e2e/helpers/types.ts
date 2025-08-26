export interface JiraIssue {
    fields: Record<string, any>;
    renderedFields: Record<string, any>;
}

export type FieldUpdater = (issue: JiraIssue, value: string | object) => JiraIssue;

export interface PullRequestComment {
    id: string | number;
    content: {
        raw: string;
        html?: string;
        markup?: 'markdown' | 'creole' | string;
    };
    created_on?: string;
    updated_on?: string;
    user?: Record<string, any>;
    deleted?: boolean;
    type?: string;
    links?: Record<string, any>;
    pullrequest?: {
        id: number;
        type?: string;
        links?: Record<string, any>;
    };
}
