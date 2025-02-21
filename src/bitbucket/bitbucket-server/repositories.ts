import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketBranchingModel, BitbucketSite, Commit, Repo, RepositoriesApi } from '../model';
import { ServerPullRequestApi } from './pullRequests';

export class ServerRepositoriesApi implements RepositoriesApi {
    private repoCache: CacheMap = new CacheMap();
    private branchingModelCache: CacheMap = new CacheMap();

    constructor(private client: HTTPClient) {}

    async getMirrorHosts(): Promise<string[]> {
        try {
            const { data } = await this.client.get(`/rest/mirroring/1.0/mirrorServers?limit=100`);

            return data.values.map((val: any) => new URL(val.baseUrl).hostname);
        } catch {
            // ignore
        }
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
            this.client.get(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}`),
            this.getBranchingModel(site),
        ]);

        const { data: defaultBranch } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/branches/default`,
        );

        const repo = ServerRepositoriesApi.toRepo(site, repoData.data, defaultBranch.id, branchingModel);
        this.repoCache.setItem(cacheKey, repo);
        return repo;
    }

    async getDevelopmentBranch(site: BitbucketSite): Promise<string> {
        const branchingModel = await this.getBranchingModel(site);

        return branchingModel?.development?.branch?.name;
    }

    async getBranches(site: BitbucketSite): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/branches`, {
            limit: 100,
        });

        return data.values.map((val: any) => val.displayId);
    }

    async getBranchingModel(site: BitbucketSite): Promise<BitbucketBranchingModel> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${ownerSlug}::${repoSlug}`;

        const cacheItem = this.branchingModelCache.getItem<BitbucketBranchingModel>(cacheKey);
        if (cacheItem !== undefined) {
            return cacheItem;
        }

        const { data } = await this.client.get(
            `/rest/branch-utils/1.0/projects/${ownerSlug}/repos/${repoSlug}/branchmodel`,
        );

        const result = {
            type: 'branching_model',
            branch_types: (data.types || []).map((type: any) => ({
                kind: type.displayName,
                prefix: type.prefix,
            })),
            development: data.development
                ? {
                      branch: {
                          name: data.development.displayId,
                      },
                  }
                : undefined,
        };

        this.branchingModelCache.setItem(cacheKey, result);
        return result;
    }

    async getCommitsForRefs(site: BitbucketSite, includeRef: string, excludeRef: string): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/commits`, {
            until: includeRef,
            since: excludeRef,
        });

        const commits: any[] = data.values || [];

        return commits.map((commit) => ({
            hash: commit.id,
            message: commit.message!,
            ts: commit.authorTimestamp,
            url: undefined!,
            htmlSummary: commit.summary ? commit.summary.html! : undefined,
            rawSummary: commit.summary ? commit.summary.raw! : undefined,
            author: ServerPullRequestApi.toUser(site.details, commit.author),
        }));
    }

    /**
     * This method then uses `git show` and scans the commit message for an
     * explicit mention of a pull request, which is populated by default in the
     * Bitbucket UI.
     *
     * This won't work if the author of the PR wrote a custom commit message
     * without mentioning the PR.
     */
    async getPullRequestIdsForCommit(site: BitbucketSite, commitHash: string): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/commits/${commitHash}/pull-requests`,
        );

        return data.values!.map((pr: any) => pr.id) || [];
    }

    async fetchImage(url: string): Promise<string> {
        const { data } = await this.client.getArrayBuffer(url);
        return data;
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toRepo(
        site: BitbucketSite,
        bbRepo: any,
        defaultBranch: string,
        branchingModel?: BitbucketBranchingModel,
    ): Repo {
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

        let url: string = Array.isArray(bbRepo.links.self) ? bbRepo.links.self[0].href || '' : '';
        url = url.endsWith('/browse') ? url.slice(0, url.lastIndexOf('/browse')) : url;

        return {
            id: bbRepo.id,
            name: bbRepo.slug,
            displayName: bbRepo.name,
            fullName: `${bbRepo.project.key}/${bbRepo.slug}`,
            parentFullName: bbRepo.origin ? `${bbRepo.origin.project.key}/${bbRepo.origin.slug}` : undefined,
            url: url,
            avatarUrl: ServerRepositoriesApi.patchAvatarUrl(site.details.baseLinkUrl, bbRepo.avatarUrl),
            mainbranch: defaultBranch,
            branchingModel: branchingModel,
            issueTrackerEnabled: false,
        };
    }
}
