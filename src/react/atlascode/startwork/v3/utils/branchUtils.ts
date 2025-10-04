import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Mustache from 'mustache';

import { BranchType, RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../../typings/git';

export const getAllBranches = (repoData: RepoData | undefined) => {
    return repoData ? [...repoData.localBranches, ...repoData.remoteBranches] : [];
};

/**
 * Finds the best default source branch from a list of branches.
 * First tries to find the configured development branch, then falls back to common main branches.
 */
export const findDefaultSourceBranch = (localBranches: Branch[], developmentBranch?: string): Branch | undefined => {
    // First, try to find the configured development branch
    if (developmentBranch) {
        const configuredBranch = localBranches.find((b) => b.name === developmentBranch);
        if (configuredBranch) {
            return configuredBranch;
        }
    }

    // If no development branch is configured (e.g., for non-Bitbucket repos),
    // try to find common main branches in order of preference
    const commonMainBranches = ['main', 'master', 'develop'];
    for (const branchName of commonMainBranches) {
        const mainBranch = localBranches.find((b) => b.name === branchName);
        if (mainBranch) {
            return mainBranch;
        }
    }

    // Fall back to the first local branch if nothing else is found
    return localBranches[0];
};

export const getDefaultSourceBranch = (repoData: RepoData | undefined): Branch => {
    if (!repoData) {
        return { type: 0, name: '' };
    }

    const defaultBranch = findDefaultSourceBranch(repoData.localBranches, repoData.developmentBranch);
    return defaultBranch || { type: 0, name: '' };
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
