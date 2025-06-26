export interface BranchNameInput {
    branchType: { prefix: string };
    issue: { key: string; summary: string };
    userEmail?: string;
}

export function buildBranchName({ branchType, issue, userEmail }: BranchNameInput) {
    const usernameBase = userEmail
        ? userEmail
              .split('@')[0]
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
        : 'username';

    const prefixBase = branchType.prefix.replace(/ /g, '-');
    const summaryBase = issue.summary
        .substring(0, 50)
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\W+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return {
        username: usernameBase.toLowerCase(),
        UserName: usernameBase,
        USERNAME: usernameBase.toUpperCase(),
        prefix: prefixBase.toLowerCase(),
        Prefix: prefixBase,
        PREFIX: prefixBase.toUpperCase(),
        issueKey: issue.key,
        issuekey: issue.key.toLowerCase(),
        IssueKey: issue.key,
        ISSUEKEY: issue.key.toUpperCase(),
        summary: summaryBase.toLowerCase(),
        Summary: summaryBase,
        SUMMARY: summaryBase.toUpperCase(),
    };
}
