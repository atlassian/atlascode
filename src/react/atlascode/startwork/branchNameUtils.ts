export interface BranchNameInput {
    branchType: { prefix: string };
    issue: { key: string; summary: string };
}

export function buildBranchName({ branchType, issue }: BranchNameInput) {
    return {
        prefix: branchType.prefix.replace(/ /g, '-').toLowerCase(),
        Prefix: branchType.prefix.replace(/ /g, '-'),
        PREFIX: branchType.prefix.replace(/ /g, '-').toUpperCase(),
        issueKey: issue.key,
        issuekey: issue.key.toLowerCase(),
        summary: issue.summary
            .substring(0, 50)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
        Summary: issue.summary
            .substring(0, 50)
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
        SUMMARY: issue.summary
            .substring(0, 50)
            .trim()
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\W+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
    };
}
