import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import axios, { CancelToken, CancelTokenSource } from 'axios';
import { Uri, commands } from 'vscode';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Commit, FileDiff, FileStatus, PullRequest, User, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { parseJiraIssueKeys } from '../../jira/issueKeyParser';
import { transitionIssue } from '../../jira/transitionIssue';
import { CancellationManager } from '../../lib/cancellation';
import { SubmitCreateRequestAction } from '../../lib/ipc/fromUI/createPullRequest';
import { RepoData, emptyRepoData } from '../../lib/ipc/toUI/createPullRequest';
import { CreatePullRequestActionApi } from '../../lib/webview/controller/pullrequest/createPullRequestActionApi';
import { Logger } from '../../logger';
import { Branch, Commit as GitCommit } from '../../typings/git';
import { Shell } from '../../util/shell';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { FileDiffQueryParams } from '../../views/pullrequest/diffViewHelper';

export class VSCCreatePullRequestActionApi implements CreatePullRequestActionApi {
    constructor(private cancellationManager: CancellationManager) {}

    getWorkspaceRepos(): WorkspaceRepo[] {
        return Container.bitbucketContext?.getAllRepositories() || [];
    }

    async getRepoDetails(wsRepo: WorkspaceRepo): Promise<RepoData> {
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            return emptyRepoData;
        }
        const client = await clientForSite(wsRepo.mainSiteRemote.site!);
        const [repoDetails, defaultReviewers] = await Promise.all([
            client.repositories.get(site),
            client.pullrequests.getReviewers(site),
        ]);

        const developmentBranch = repoDetails.developmentBranch;
        const href = repoDetails.url;
        const isCloud = wsRepo.mainSiteRemote.site?.details?.isCloud === true;

        const repoScmState = await this.getRepoScmState(wsRepo);
        const currentUser = await this.currentUser(wsRepo.mainSiteRemote.site!);

        const repoData: RepoData = {
            workspaceRepo: wsRepo,
            href: href,
            //branchTypes: [],
            developmentBranch: developmentBranch,
            defaultReviewers: defaultReviewers.filter((r) => r.accountId !== currentUser.accountId),
            isCloud: isCloud,
            localBranches: repoScmState.localBranches,
            remoteBranches: repoScmState.remoteBranches,
            hasSubmodules: repoScmState.hasSubmodules,
            hasLocalChanges: repoScmState.hasLocalChanges,
        };

        return repoData;
    }

    async getRepoScmState(wsRepo: WorkspaceRepo): Promise<{
        localBranches: Branch[];
        remoteBranches: Branch[];
        hasSubmodules: boolean;
        hasLocalChanges: boolean;
    }> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        return {
            localBranches: await scm.getBranches({ remote: false }),
            remoteBranches: await scm.getBranches({ remote: true }),
            hasSubmodules: scm.state.submodules.length > 0,
            hasLocalChanges:
                scm.state.workingTreeChanges.length + scm.state.indexChanges.length + scm.state.mergeChanges.length > 0,
        };
    }

    async currentUser(site: BitbucketSite): Promise<User> {
        const client = await Container.clientManager.bbClient(site.details);
        return await client.pullrequests.getCurrentUser(site.details);
    }

    async fetchUsers(site: BitbucketSite, query: string, abortKey?: string | undefined): Promise<User[]> {
        const client = await Container.clientManager.bbClient(site.details);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this.cancellationManager.set(abortKey, signal);
        }

        return await client.pullrequests.getReviewers(site, query, cancelToken);
    }

    async fetchIssue(branchName: string): Promise<MinimalIssue<DetailedSiteInfo> | undefined> {
        if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            const jiraIssueKeys = parseJiraIssueKeys(branchName);

            if (jiraIssueKeys.length > 0) {
                try {
                    return await issueForKey(jiraIssueKeys[0]);
                } catch {
                    //not found
                }
            }
        }
        return undefined;
    }

    async fetchDetails(
        wsRepo: WorkspaceRepo,
        sourceBranch: Branch,
        destinationBranch: Branch,
    ): Promise<[Commit[], FileDiff[]]> {
        const site = wsRepo.mainSiteRemote.site!;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(`${destinationBranch.remote}/`, '');

        let commits = [];

        try {
            const bbApi = await clientForSite(site);
            commits = await bbApi.repositories.getCommitsForRefs(site, sourceBranchName, destinationBranchName);
        } catch {}

        const shell = new Shell(Uri.parse(wsRepo.rootUri).fsPath);
        const diff = await shell.output(
            `git log --format=${this.commitFormat} ${destinationBranch.name}..${sourceBranchName} -z`,
        );
        const gitCommits = this.parseGitCommits(diff);

        commits = gitCommits.map((c) => ({
            author: {
                accountId: '',
                displayName: c.authorEmail!,
                avatarUrl: '',
                mention: '',
                url: '',
            },
            ts: c.authorDate!.toString(),
            hash: c.hash,
            message: c.message,
            url: '',
            htmlSummary: '',
            rawSummary: '',
        }));

        const fileDiffs = await this.generateDiff(wsRepo, destinationBranch, sourceBranch);

        return [commits, fileDiffs];
    }

    commitFormat = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%B';
    commitRegex = /([0-9a-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)/gm;

    private parseGitCommits(data: string): GitCommit[] {
        const commits: GitCommit[] = [];

        let match;

        do {
            match = this.commitRegex.exec(data);
            if (match === null) {
                break;
            }

            const [, ref, authorName, authorEmail, authorDate, commitDate, parents, message] = match;

            commits.push({
                hash: ` ${ref}`.substr(1),
                message: ` ${message}`.substr(1),
                parents: parents ? parents.split(' ') : [],
                authorDate: new Date(Number(authorDate) * 1000),
                authorName: ` ${authorName}`.substr(1),
                authorEmail: ` ${authorEmail}`.substr(1),
                //@ts-ignore
                commitDate: new Date(Number(commitDate) * 1000),
            });
        } while (true);

        return commits;
    }

    async findForkPoint(wsRepo: WorkspaceRepo, sourceBranch: Branch, destinationBranch: Branch): Promise<string> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        //When fetching the destination branch, we need to slice the remote off the branch name because the branch isn't actually called {remoteName}/{branchName}
        await scm.fetch(destinationBranch.remote, destinationBranch.name!.slice(destinationBranch.remote!.length + 1));
        const commonCommit = await scm.getMergeBase(destinationBranch.name!, sourceBranch.name!);
        return commonCommit;
    }

    getFilePaths(namestatusWords: string[], status: FileStatus): { lhsFilePath: string; rhsFilePath: string } {
        if (status === FileStatus.ADDED) {
            return { lhsFilePath: '', rhsFilePath: namestatusWords[1] };
        } else if (status === FileStatus.DELETED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: '' };
        } else if (status === FileStatus.MODIFIED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[1] };
        } else if (status === FileStatus.RENAMED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[2] };
        } else {
            //I'm actually not totally sure what should happen if the other cases are hit...
            //Copy, Type changed, unknown, etc.
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[1] };
        }
    }

    async generateDiff(wsRepo: WorkspaceRepo, destinationBranch: Branch, sourceBranch: Branch): Promise<FileDiff[]> {
        const shell = new Shell(Uri.parse(wsRepo.rootUri).fsPath);

        const forkPoint = await this.findForkPoint(wsRepo, sourceBranch, destinationBranch);

        //Using git diff --numstat will generate lines in the format '{lines added}      {lines removed}     {name of file}'
        //We want to seperate each line and extract this data so we can create a file diff
        //NOTE: the '-M50' flag will cause git to detect any added/deleted file combo as a rename if they're 50% similar
        const numstatLines = await shell.lines(`git diff --numstat -C -M50 ${forkPoint} ${sourceBranch.commit}`);

        if (numstatLines.length === 0) {
            return [];
        }

        //The bitbucket website also provides a status for each file (modified, added, deleted, etc.), so we need to get this info too.
        //git diff-index --name-status will return lines in the form {status}        {name of file}
        //It's important to note that the order of the files will be identical to git diff --numstat, and we can use that to our advantage
        const namestatusLines = await shell.lines(`git diff --name-status -C -M50 ${forkPoint} ${sourceBranch.commit}`);
        const fileDiffs: FileDiff[] = [];
        for (let i = 0; i < numstatLines.length; i++) {
            const numstatWords = numstatLines[i].split(/\s+/);
            const namestatusWords = namestatusLines[i].split(/\s+/);

            //Most of the time when we split by white space we get 3 elements because we have the format {lines added}   {lines removed}   {name of file}
            //However, in the case of a renamed file, the file name will be '{oldFileName => newFileName}'. To account for this case, we slice and join everything after the file name start.
            const filePath = numstatWords.slice(2).join(' ');
            const firstLetterOfStatus = namestatusWords[0].slice(0, 1) as FileStatus;
            const fileStatus = (
                Object.values(FileStatus).includes(firstLetterOfStatus) ? firstLetterOfStatus : 'X'
            ) as FileStatus;
            const { lhsFilePath, rhsFilePath } = this.getFilePaths(namestatusWords, fileStatus);
            fileDiffs.push({
                linesAdded: +numstatWords[0],
                linesRemoved: +numstatWords[1],
                file: filePath,
                status: fileStatus,
                similarity: fileStatus === FileStatus.RENAMED ? +namestatusWords[0].slice(1) : undefined,
                lhsQueryParams: {
                    lhs: true,
                    repoUri: wsRepo.rootUri,
                    branchName: destinationBranch.name,
                    commitHash: forkPoint,
                    path: lhsFilePath,
                } as FileDiffQueryParams,
                rhsQueryParams: {
                    lhs: false,
                    repoUri: wsRepo.rootUri,
                    branchName: sourceBranch.name,
                    commitHash: sourceBranch.commit,
                    path: rhsFilePath,
                } as FileDiffQueryParams,
            });
        }

        return fileDiffs;
    }

    openDiff(fileDiff: FileDiff): void {
        const lhsQuery = { query: JSON.stringify(fileDiff.lhsQueryParams) };
        const rhsQuery = { query: JSON.stringify(fileDiff.rhsQueryParams) };
        const fileDisplayName = fileDiff.file;

        const lhsUri = Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQuery);
        const rhsUri = Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQuery);
        commands.executeCommand('vscode.diff', lhsUri, rhsUri, fileDisplayName);
    }

    async create(data: SubmitCreateRequestAction): Promise<PullRequest> {
        if (data.pushLocalChanges) {
            Logger.info(
                `pushing local changes for branch: ${data.sourceBranch.name} to remote: ${data.sourceRemoteName} `,
            );
            const scm = Container.bitbucketContext.getRepositoryScm(data.workspaceRepo.rootUri)!;
            await scm.push(data.sourceRemoteName, data.sourceBranch.name);
        }

        const destinationSiteRemote = data.workspaceRepo.siteRemotes.find(
            (r) => r.remote.name === data.destinationBranch.remote,
        )!;
        // fallback to mainSite remote if destinationSiteRemote is not passed
        const site = destinationSiteRemote?.site ?? data.workspaceRepo.mainSiteRemote.site;
        if (!site) {
            Logger.warn('Cannot find remote configured in destination site or in workspace repo');
            throw new Error('Cannot find remote configured in destination site or in workspace repo');
        }
        const bbApi = await clientForSite(site);

        const destinationBranchName = data.destinationBranch.name!.replace(`${data.destinationBranch.remote}/`, '');

        const pr = await bbApi.pullrequests.create(site, data.workspaceRepo, {
            sourceBranchName: data.sourceBranch.name!,
            destinationBranchName: destinationBranchName,
            sourceSite: data.sourceSiteRemote.site!,
            title: data.title,
            summary: data.summary,
            closeSourceBranch: data.closeSourceBranch,
            reviewerAccountIds: data.reviewers.map((r) => r.accountId),
        });

        if (data.issue && data.transition) {
            await transitionIssue(data.issue, data.transition);
        }

        commands.executeCommand(Commands.BitbucketShowPullRequestDetails, pr);
        commands.executeCommand(Commands.BitbucketRefreshPullRequests);

        Container.createPullRequestWebviewFactory.hide();

        return pr;
    }
}
