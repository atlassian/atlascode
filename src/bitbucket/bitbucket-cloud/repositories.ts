import { CancelToken } from 'axios';

import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketBranchingModel, BitbucketSite, Commit, Repo, RepositoriesApi, UnknownUser } from '../model';
import { CloudPullRequestApi, maxItemsSupported } from './pullRequests';

export class CloudRepositoriesApi implements RepositoriesApi {
    private repoCache: CacheMap = new CacheMap();
    private branchingModelCache: CacheMap = new CacheMap();

    constructor(private client: HTTPClient) {}

    async getMirrorHosts(): Promise<string[]> {
        return [];
    }

    async get(site: BitbucketSite): Promise<Repo> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${ownerSlug}::${repoSlug}`;

        const cacheItem = this.repoCache.getItem<Repo>(cacheKey);
        if (cacheItem !== undefined) {
            return cacheItem;
        }

        const [repoData, branchingModel] = await Promise.all([
            this.client.get(`/repositories/${ownerSlug}/${repoSlug}`),
            this.getBranchingModel(site),
        ]);

        const repo: Repo = CloudRepositoriesApi.toRepo(repoData.data, branchingModel);

        this.repoCache.setItem(cacheKey, repo);
        return repo;
    }

    async getDevelopmentBranch(site: BitbucketSite): Promise<string> {
        const [repo, branchingModel] = await Promise.all([this.get(site), this.getBranchingModel(site)]);

        return branchingModel?.development?.branch?.name ?? repo.mainbranch!;
    }

    async getBranches(site: BitbucketSite): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/refs/branches`, {
            pagelen: 100,
            fields: 'values.name',
        });

        return data.values.map((val: any) => val.name);
    }

    async getBranchingModel(site: BitbucketSite): Promise<BitbucketBranchingModel> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${ownerSlug}::${repoSlug}`;

        const cacheItem = this.branchingModelCache.getItem<BitbucketBranchingModel>(cacheKey);
        if (cacheItem !== undefined) {
            return cacheItem;
        }

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/branching-model`);

        this.branchingModelCache.setItem(cacheKey, data);
        return data;
    }

    async getCommitsForRefs(site: BitbucketSite, includeRef: string, excludeRef: string): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/commits`, {
            include: includeRef,
            exclude: excludeRef,
            pagelen: maxItemsSupported.commits,
        });

        const commits: any[] = data.values || [];

        return commits.map((commit) => ({
            hash: commit.hash!,
            message: commit.message!,
            ts: commit.date!,
            url: commit.links!.html!.href!,
            htmlSummary: commit.summary ? commit.summary.html! : '',
            rawSummary: commit.summary ? commit.summary.raw! : '',
            author: commit.author ? CloudPullRequestApi.toUserModel(commit.author!.user) : UnknownUser,
        }));
    }

    async getPullRequestIdsForCommit(site: BitbucketSite, commitHash: string): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/pullrequests`,
        );

        return data.values!.map((pr: any) => pr.id) || [];
    }

    async fetchImage(url: string): Promise<string> {
        const { data } = await this.client.getArrayBuffer(url);
        return data;
    }

    static toRepo(bbRepo: any, branchingModel?: BitbucketBranchingModel): Repo {
        if (!bbRepo) {
            return {
                id: 'REPO_NOT_FOUND',
                name: 'REPO_NOT_FOUND',
                displayName: 'REPO_NOT_FOUND',
                fullName: 'REPO_NOT_FOUND',
                url: '',
                avatarUrl: '',
                mainbranch: undefined,
                issueTrackerEnabled: false,
            };
        }

        const mainbranch = bbRepo.mainbranch?.name;
        const developmentBranch = branchingModel?.development?.branch?.name || mainbranch;

        return {
            id: bbRepo.uuid!,
            name: bbRepo.owner ? bbRepo.owner!.username! : bbRepo.name!,
            displayName: bbRepo.name!,
            fullName: bbRepo.full_name!,
            parentFullName: bbRepo.parent?.full_name,
            url: bbRepo.links!.html!.href!,
            avatarUrl: bbRepo.links!.avatar!.href!,
            mainbranch: mainbranch,
            developmentBranch: developmentBranch,
            branchingModel: branchingModel,
            issueTrackerEnabled: !!bbRepo.has_issues,
        };
    }

    async fetchWorkspaces(query: string, cancelToken?: CancelToken): Promise<string[]> {
        const { data } = await this.client.get(
            `/user/permissions/workspaces`,
            {
                q: `workspace.slug ~ "${query}"`,
            },
            cancelToken,
        );
        return data.values.map((workspaceMembership: any) => workspaceMembership.workspace.slug);
    }
}
