import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { Shell } from '../../util/shell';
import { PRFileDiffQueryParams } from '../../views/pullrequest/diffViewHelper';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { CommandBase } from '../command/command-base';
import { BitbucketCloudSite } from '../hosts/bitbucket-cloud';
import { BitbucketServerSite } from '../hosts/bitbucket-server';
import { BitbucketSiteBase } from '../hosts/bitbucket-site-base';

export class Backend {
    private shell: Shell;
    public static root = 'git rev-parse --show-toplevel';

    constructor(public readonly root: string) {
        this.shell = new Shell(root);
    }

    /**
     * Get the repository corresponding to the open editor.
     */
    public findRepository(): WorkspaceRepo {
        const editor = CommandBase.getOpenEditor();
        let editorUri = editor.document.uri.toString();
        if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
            const queryParams = JSON.parse(editor.document.uri.query) as PRFileDiffQueryParams;
            editorUri = queryParams.repoUri;
        }

        const result = Container.bitbucketContext
            .getBitbucketRepositories()
            .find((repo) => editorUri.startsWith(repo.rootUri));
        if (!result) {
            throw new Error('Unable to find a Bitbucket repository');
        }
        return result;
    }

    /**
     * Get the remote Bitbucket site.
     */
    public async findBitbucketSite(): Promise<BitbucketSiteBase> {
        const wsRepo = this.findRepository();
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            throw new Error('Unable to find bitbucket site');
        }
        return site.details.isCloud ? new BitbucketCloudSite(site) : new BitbucketServerSite(site);
    }

    /**
     * Get the hash of the commit/changeset that's currently checked out.
     */
    public async findCurrentRevision(): Promise<string> {
        const wsRepo = this.findRepository();
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri);
        if (scm && scm.state.HEAD && scm.state.HEAD.commit) {
            return scm.state.HEAD.commit;
        }
        throw new Error('Unable to get the current revision');
    }

    /**
     * Get the hash of the revision associated with the current line.
     */
    public async findSelectedRevision(file: string, line: number): Promise<string> {
        const output = await this.shell.output(`git blame --root -l -L ${line},${line} ${file}`);
        const match = output.match(/^(\w+)/);
        if (match) {
            return match[1];
        }
        throw new Error('Unable to find the selected revision');
    }

    /**
     * Get the Bitbucket pull request ID where a given change was merged.
     */
    public async getPullRequestId(targetRevision: string): Promise<string> {
        const editor = CommandBase.getOpenEditor();
        if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
            const queryParams = JSON.parse(editor.document.uri.query) as PRFileDiffQueryParams;
            return queryParams.prId;
        }

        const wsRepo = this.findRepository();
        const site = wsRepo.mainSiteRemote.site;
        if (site) {
            const bbApi = await clientForSite(site);
            const prs = await bbApi.repositories.getPullRequestIdsForCommit(site, targetRevision);
            if (prs.length > 0) {
                return prs[prs.length - 1];
            }
        }

        throw new Error('Unable to determine the pull request');
    }

    /**
     * Get the repository's main branch name.
     * Falls back to 'master' if the main branch cannot be determined.
     */
    public async findMainBranch(): Promise<string> {
        const wsRepo = this.findRepository();
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            return 'master';
        }
        try {
            const bbApi = await clientForSite(site);
            const repo = await bbApi.repositories.get(site);
            if (repo.mainbranch) {
                return repo.mainbranch;
            }
        } catch (e) {
            // Fall back to default if unable to fetch
            console.warn('Failed to fetch main branch from API:', e instanceof Error ? e.message : String(e));
        }
        return 'master';
    }
}
