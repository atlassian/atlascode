import { RepoData } from '../../../../../lib/ipc/toUI/startWork';

export const getAllBranches = (repoData: RepoData | undefined) => {
    return repoData ? [...repoData.localBranches, ...repoData.remoteBranches] : [];
};

export const getDefaultSourceBranch = (repoData: RepoData | undefined): string => {
    if (!repoData) {
        return '';
    }

    const defaultBranch =
        repoData.localBranches?.find((b) => repoData.developmentBranch && b.name === repoData.developmentBranch)
            ?.name ||
        repoData.localBranches?.[0]?.name ||
        '';

    return defaultBranch;
};
