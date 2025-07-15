export enum AuthFormType {
    JiraCloud = 'jiraCloud',
    CustomSite = 'customSite',
    None = 'none',
}

export const cloudHostnames = ['atlassian.net', 'jira.com', 'jira-dev.com', 'bitbucket.org', 'bb-inf.net'];

export const FIELD_NAMES = {
    USERNAME: 'username',
    PASSWORD: 'password',
    PAT: 'personalAccessToken',
} as const;
