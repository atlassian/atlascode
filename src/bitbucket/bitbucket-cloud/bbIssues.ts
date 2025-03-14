import { HTTPClient } from '../httpClient';
import {
    BitbucketIssue,
    BitbucketSite,
    Comment,
    emptyBitbucketSite,
    emptyUser,
    PaginatedBitbucketIssues,
    PaginatedComments,
    UnknownUser,
    User,
    WorkspaceRepo,
} from '../model';
import { CloudPullRequestApi } from './pullRequests';

const defaultPageLength = 25;
const maxItemsSupported = {
    comments: 100,
    changes: 100,
};

export class BitbucketIssuesApiImpl {
    constructor(private client: HTTPClient) {}

    // ---- BEGIN - Actions NOT on a specific issue ----
    // ---- => ensure Bitbucket issues are enabled for the repo

    async getList(workspaceRepo: WorkspaceRepo): Promise<PaginatedBitbucketIssues> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo: workspaceRepo, site: emptyBitbucketSite, data: [], next: undefined };
        }

        if (!(await this.bitbucketIssuesEnabled(site))) {
            return { workspaceRepo, site, data: [], next: undefined };
        }

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/issues`, {
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"',
        });

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues, next: data.next };
    }

    async getAvailableComponents(site: BitbucketSite): Promise<any[] | undefined> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/components`, {
            pagelen: defaultPageLength,
        });

        return data.values;
    }

    async getIssuesForKeys(site: BitbucketSite, issueKeys: string[]): Promise<BitbucketIssue[]> {
        if (!(await this.bitbucketIssuesEnabled(site))) {
            return [];
        }

        const { ownerSlug, repoSlug } = site;

        const keyNumbers = issueKeys.map((key) => key.replace('#', ''));

        const results = await Promise.all(
            keyNumbers.map((key) => this.client.get(`/repositories/${ownerSlug}/${repoSlug}/issues/${key}`)),
        );

        return results.filter((result) => !!result).map((result) => ({ site, data: result.data }));
    }

    async getLatest(workspaceRepo: WorkspaceRepo): Promise<PaginatedBitbucketIssues> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo: workspaceRepo, site: emptyBitbucketSite, data: [], next: undefined };
        }

        if (!(await this.bitbucketIssuesEnabled(site))) {
            return { workspaceRepo, site, data: [], next: undefined };
        }

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/issues`, {
            pagelen: 2,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on',
        });

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues, next: data.next };
    }

    async bitbucketIssuesEnabled(site: BitbucketSite): Promise<boolean> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}`);

        return !!data.has_issues;
    }

    // ---- END - Actions NOT on a specific issue ----

    // ---- BEGIN - Issue specific actions ----
    // ---- => Bitbucket issues enabled for the repo

    async refetch(issue: BitbucketIssue): Promise<BitbucketIssue> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}`);

        return { ...issue, data: data };
    }

    async getComments(issue: BitbucketIssue): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/comments`,
            {
                issue_id: issue.data.id!.toString(),
                pagelen: maxItemsSupported.comments,
                sort: '-created_on',
            },
        );

        return {
            // we fetch the data sorted by `-created_on` to get the latest comments
            // reverse them again to return the data in chronological order
            data: (data.values || []).reverse().map(this.toCommentModel),
            next: data.next,
        };
    }

    private toCommentModel(comment: any): Comment {
        return {
            id: comment.id!,
            parentId: comment.parent ? comment.parent.id! : undefined,
            htmlContent: comment.content!.html!,
            rawContent: comment.content!.raw!,
            ts: comment.created_on!,
            updatedTs: comment.updated_on!,
            deleted: !!comment.deleted,
            deletable: false,
            editable: false,
            inline: comment.inline,
            user: comment.user
                ? {
                      accountId: comment.user.account_id!,
                      displayName: comment.user.display_name!,
                      url: comment.user.links!.html!.href!,
                      avatarUrl: comment.user.links!.avatar!.href!,
                      mention: `@[${comment.user.display_name!}](account_id:${comment.user.account_id!})`,
                  }
                : UnknownUser,
            children: [],
            tasks: [],
        };
    }

    async getChanges(issue: BitbucketIssue, pagelen?: number): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
            {
                pagelen: pagelen || maxItemsSupported.changes,
                sort: '-created_on',
            },
        );

        // we fetch the data sorted by `-created_on` to get the latest changes
        // reverse them again to return the data in chronological order
        const changes: any[] = (data.values || []).reverse();
        const comments: Comment[] = changes.map(this.convertChangeToComment);

        return { data: comments, next: data.next };
    }

    private convertChangeToComment(change: any): Comment {
        let content = '';
        if (change.changes!.state) {
            content += `<li><em>changed status from <strong>${change.changes!.state!.old}</strong> to <strong>${
                change.changes!.state!.new
            }</strong></em></li>`;
        }
        if (change.changes!.kind) {
            content += `<li><em>changed issue type from <strong>${change.changes!.kind!.old}</strong> to <strong>${
                change.changes!.kind!.new
            }</strong></em></li>`;
        }
        if (change.changes!.priority) {
            content += `<li><em>changed issue priority from <strong>${
                change.changes!.priority!.old
            }</strong> to <strong>${change.changes!.priority!.new}</strong></em></li>`;
        }
        //@ts-ignore
        if (change.changes!.attachment && change.changes!.attachment!.new) {
            //@ts-ignore
            content += `<li><em>added attachment <strong>${change.changes!.attachment!.new}</strong></em></li>`;
        }
        //@ts-ignore
        if (change.changes!.assignee_account_id) {
            content += `<li><em>updated assignee</em></li>`;
        }
        if (change.changes!.content) {
            content += `<li><em>updated description</em></li>`;
        }
        if (change.changes!.title) {
            content += `<li><em>updated title</em></li>`;
        }

        if (content === '') {
            content += `<li><em>updated issue</em></li>`;
        }

        change = { ...change, message: { html: `<p><ul>${content}</ul>${change.message!.html}</p>` } };

        return {
            id: change.id as string,
            htmlContent: change.message!.html!,
            rawContent: change.message!.raw!,
            deleted: false,
            deletable: false,
            editable: false,
            ts: change.created_on!,
            updatedTs: change.created_on!,
            user: change.user
                ? {
                      accountId: change.user.account_id!,
                      displayName: change.user.display_name!,
                      url: change.user.links!.html!.href!,
                      avatarUrl: change.user.links!.avatar!.href!,
                      mention: `@[${change.user.display_name!}](account_id:${change.user.account_id})`,
                  }
                : UnknownUser,
            children: [],
            tasks: [],
        };
    }

    async postChange(issue: BitbucketIssue, newStatus: string, content?: string): Promise<[string, Comment]> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
            {
                type: 'issue_change',
                changes: {
                    state: {
                        new: newStatus,
                    },
                },
                content: {
                    raw: content,
                },
            },
        );

        return [data.changes.state.new, this.convertChangeToComment(data)];
    }

    async postNewComponent(issue: BitbucketIssue, newComponent: string): Promise<void> {
        const { ownerSlug, repoSlug } = issue.site;

        await this.client.post(`/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`, {
            type: 'issue_change',
            changes: {
                component: {
                    new: newComponent,
                },
            },
        });
    }

    async postComment(issue: BitbucketIssue, content: string): Promise<Comment> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/comments`,
            {
                type: 'issue_comment',
                content: {
                    raw: content,
                },
            },
        );
        return this.toCommentModel(data);
    }

    async assign(issue: BitbucketIssue, account_id?: string): Promise<[User, Comment]> {
        const { ownerSlug, repoSlug } = issue.site;

        if (account_id) {
            const { data } = await this.client.post(
                `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
                {
                    type: 'issue_change',
                    changes: {
                        assignee_account_id: {
                            new: account_id,
                        },
                    },
                },
                { fields: '+issue.assignee' },
            );
            return [CloudPullRequestApi.toUserModel(data.issue.assignee), this.convertChangeToComment(data)];
        }

        await this.client.put(`/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}`, {
            type: 'issue',
            assignee: null,
        });
        // not ideal - the changes endpoint doesn't work for unassigning users,
        // so we fetch the latest change here to update the webview comments
        const change = await this.getChanges(issue, 1);

        return [{ ...emptyUser, displayName: 'Unassigned' }, change.data[0]];
    }

    async create(
        site: BitbucketSite,
        title: string,
        description: string,
        kind: string,
        priority: string,
    ): Promise<BitbucketIssue> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(`/repositories/${ownerSlug}/${repoSlug}/issues`, {
            type: 'issue',
            title: title,
            content: {
                raw: description,
            },
            //@ts-ignore
            kind: kind,
            priority: priority,
        });

        return { site, data };
    }

    async nextPage({ workspaceRepo, site, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        const { data } = await this.client.get(next!);

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues || [], next: data.next };
    }

    // ---- END - Issue specific actions ----
}
