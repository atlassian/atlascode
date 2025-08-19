import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Mustache from 'mustache';

import { BranchType, RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../../typings/git';

export const getAllBranches = (repoData: RepoData | undefined) => {
    return repoData ? [...repoData.localBranches, ...repoData.remoteBranches] : [];
};

export const getDefaultSourceBranch = (repoData: RepoData | undefined): Branch => {
    if (!repoData) {
        return { type: 0, name: '' };
    }

    const defaultBranch = repoData.localBranches?.find(
        (b) => repoData.developmentBranch && b.name === repoData.developmentBranch,
    ) ||
        repoData.localBranches?.[0] || { type: 0, name: '' };

    return defaultBranch;
};

export const generateBranchName = (
    repo: RepoData,
    branchType: BranchType,
    issue: MinimalIssue<any>,
    customTemplate: string,
): string => {
    const usernameBase = repo.userEmail
        ? repo.userEmail
              .split('@')[0]
              .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
              .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
        : 'username';
    const prefixBase = branchType.prefix.replace(/ /g, '-');
    const summaryBase = issue.summary
        .substring(0, 50)
        .trim()
        .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
        .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
        .replace(/\W+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const view = {
        username: usernameBase.toLowerCase(),
        UserName: usernameBase,
        USERNAME: usernameBase.toUpperCase(),
        prefix: prefixBase.toLowerCase(),
        Prefix: prefixBase,
        PREFIX: prefixBase.toUpperCase(),
        issuekey: issue.key.toLowerCase(),
        IssueKey: issue.key,
        issueKey: issue.key,
        ISSUEKEY: issue.key.toUpperCase(),
        summary: summaryBase.toLowerCase(),
        Summary: summaryBase,
        SUMMARY: summaryBase.toUpperCase(),
    };

    try {
        return Mustache.render(customTemplate, view);
    } catch {
        return 'Invalid template: please follow the format described above';
    }
};
