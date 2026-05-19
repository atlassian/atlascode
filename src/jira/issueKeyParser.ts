export const IssueKeyRegEx = new RegExp(/[a-zA-Z][a-zA-Z0-9_]*-\d+/g);

export function parseJiraIssueKeys(text?: string): string[] {
    if (!text) {
        return [];
    }
    const issueKeys = text.match(IssueKeyRegEx) || [];
    return Array.from(new Set(issueKeys));
}
