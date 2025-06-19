// Top-level issue types in Jira that can be parent issues
export const TOP_LEVEL_ISSUE_TYPES = ['Epic', 'Initiative', 'Project'] as const;

// Type for top-level issue types
export type TopLevelIssueType = (typeof TOP_LEVEL_ISSUE_TYPES)[number];
