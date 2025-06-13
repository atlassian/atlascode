import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { toISOString } from '../../react/atlascode/util/date-fns';
import { HTTPClient } from '../httpClient';
import { BitbucketSite, PullRequest, WorkspaceRepo } from '../model';
import { CloudPullRequestApi } from './pullRequests';

export interface OverviewViewState {
    pullRequests: {
        authored: PullRequest[];
        reviewing: PullRequest[];
        closed: PullRequest[];
    };
}

function updatedAfter(minUpdatedTs?: string) {
    return (pr: PullRequest) => {
        if (!minUpdatedTs) {
            return true;
        }

        const updatedTsIsoString = toISOString(pr.data.updatedTs);
        if (!updatedTsIsoString) {
            return true;
        }

        return updatedTsIsoString > minUpdatedTs;
    };
}

export class PullRequestsOverviewApi {
    constructor(private client: HTTPClient) {}

    private extractSiteFromPRData(prData: any, site: DetailedSiteInfo): BitbucketSite {
        // Extract site information from the PR data
        const repoSlug = prData.destination.repository.full_name.split('/')[1];
        const ownerSlug = prData.destination.repository.workspace.slug;

        // Create a site object
        return {
            ownerSlug,
            repoSlug,
            details: site,
        };
    }

    private createWorkspaceRepoFromPRData(prData: any, site: BitbucketSite): WorkspaceRepo {
        // Create a minimal WorkspaceRepo object with required fields
        return {
            rootUri: prData.destination.repository.full_name,
            mainSiteRemote: {
                site: site,
                remote: {
                    name: prData.destination.repository.name,
                    fetchUrl: `https://bitbucket.org/${prData.destination.repository.full_name}.git`,
                    pushUrl: `https://bitbucket.org/${prData.destination.repository.full_name}.git`,
                    isReadOnly: true,
                },
            },
            siteRemotes: [],
        };
    }

    async getOverviewViewState(
        ownerSlug: string,
        site: DetailedSiteInfo,
        minUpdatedTs: string,
    ): Promise<OverviewViewState> {
        const fields = [
            '+pullRequests.*.author',
            '+pullRequests.*.closed_on',
            '+pullRequests.*.comment_count',
            '+pullRequests.*.created_on',
            '+pullRequests.*.destination.branch.name',
            '+pullRequests.*.destination.commit.hash',
            '+pullRequests.*.destination.repository.workspace',
            '+pullRequests.*.id',
            '+pullRequests.*.links.html',
            '+pullRequests.*.links.self',
            '+pullRequests.*.participants',
            '+pullRequests.*.repository.links.avatar',
            '+pullRequests.*.repository.links.html',
            '+pullRequests.*.repository.full_name',
            '+pullRequests.*.repository.name',
            '+pullRequests.*.source.branch.name',
            '+pullRequests.*.source.commit.hash',
            '+pullRequests.*.source.repository.workspace',
            '+pullRequests.*.state',
            '+pullRequests.*.task_count',
            '+pullRequests.*.title',
            '+pullRequests.*.updated_on',
        ].join(',');

        const { data } = await this.client.get(
            `/workspaces/${ownerSlug}/overview-view-state/?fields=${encodeURIComponent(fields)}`,
        );

        const authored: PullRequest[] = data.pullRequests.authored
            .map((pr: any) => {
                const bbSite = this.extractSiteFromPRData(pr, site);
                const workspaceRepo = this.createWorkspaceRepoFromPRData(pr, bbSite);

                return CloudPullRequestApi.toPullRequestData(pr, bbSite, workspaceRepo);
            })
            .filter(updatedAfter(minUpdatedTs));

        const reviewing: PullRequest[] = data.pullRequests.reviewing
            .map((pr: any) => {
                const bbSite = this.extractSiteFromPRData(pr, site);
                const workspaceRepo = this.createWorkspaceRepoFromPRData(pr, bbSite);
                return CloudPullRequestApi.toPullRequestData(pr, bbSite, workspaceRepo);
            })
            .filter(updatedAfter(minUpdatedTs));

        const closed: PullRequest[] = data.pullRequests.closed
            .map((pr: any) => {
                const bbSite = this.extractSiteFromPRData(pr, site);
                const workspaceRepo = this.createWorkspaceRepoFromPRData(pr, bbSite);
                return CloudPullRequestApi.toPullRequestData(pr, bbSite, workspaceRepo);
            })
            .filter(updatedAfter(minUpdatedTs));

        const response: OverviewViewState = {
            pullRequests: {
                authored,
                reviewing,
                closed,
            },
        };

        return response;
    }
}
