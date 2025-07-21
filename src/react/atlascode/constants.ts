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
    CONTEXT_PATH: 'contextPath',
    SSL_CERT_PATHS: 'sslCertPaths',
    PFX_PATH: 'pfxPath',
    PFX_PASSPHRASE: 'pfxPassphrase',
} as const;
