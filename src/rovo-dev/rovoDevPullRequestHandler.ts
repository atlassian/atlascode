import { exec } from 'child_process';
import { RovoDevLogger } from 'src/logger';
import { GitExtension, Repository } from 'src/typings/git';
import { promisify } from 'util';
import { env, extensions, Uri } from 'vscode';

export class RovoDevPullRequestHandler {
    private async getGitExtension(): Promise<GitExtension> {
        try {
            const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
            if (!gitExtension) {
                throw new Error('vscode.git extension not found');
            }
            return await gitExtension.activate();
        } catch (e) {
            console.error('Error activating git extension:', e);
            throw e;
        }
    }

    private async getGitRepository(gitExt: GitExtension): Promise<Repository> {
        const gitApi = gitExt.getAPI(1);

        if (gitApi.repositories.length === 0) {
            throw new Error('No Git repositories found');
        }

        // TODO: what do we want to do in case of multiple repositories?
        return gitApi.repositories[0];
    }

    public findPRLink(output: string): string | undefined {
        if (!output) {
            return undefined;
        }

        // TODO: This turned out to be a whole can of worms.
        // Using rather specific regexes for now; we should consider trade-offs between specificity and flexibility.
        const linkMatchers = [
            // Github: https://github.com/my-org/my-repo/pull/new/my-branch
            /https:\/\/github\.com\/[^\s]+\/pull\/new\/[^\s]+/g,
            // Bitbucket: https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch
            /https:\/\/bitbucket\.org\/[^\s]+\/pull-requests\/new\?[^\s]+/g,
            // Generic
            /https:\/\/[^\s]+\/pull[^\s]*\/new\/[^\s]+/g,
        ];

        for (const matcher of linkMatchers) {
            const match = output.match(matcher);
            if (match && match[0]) {
                RovoDevLogger.info(`Create PR: ${match[0]}`);
                return match[0];
            }
        }

        RovoDevLogger.info(`Could not find PR link in push output.`);
        RovoDevLogger.info(`Push warnings: ${output}`);
        return undefined;
    }

    // This is the happy path for single small repository
    // There would probably need to be a lot of logic in monorepos/multiple repos etc.
    public async createPR(branchName: string, commitMessage: string): Promise<string | undefined> {
        const gitExt = await this.getGitExtension();
        const repo = await this.getGitRepository(gitExt);

        await repo.fetch();
        const curBranch = repo.state.HEAD?.name;
        if (curBranch !== branchName) {
            await repo.createBranch(branchName, true);
        }
        await repo.commit(commitMessage, {
            all: true,
        });

        const execAsync = promisify(exec);

        const { stderr } = await execAsync(`git push origin ${branchName}`, {
            cwd: repo.rootUri.fsPath,
        });

        const prLink = this.findPRLink(stderr);
        if (prLink) {
            env.openExternal(Uri.parse(prLink));
        }

        return prLink;
    }

    public async getCurrentBranchName(): Promise<string | undefined> {
        const gitExt = await this.getGitExtension();
        const repo = await this.getGitRepository(gitExt);

        return repo.state.HEAD?.name;
    }

    public async isGitStateClean(): Promise<boolean> {
        try {
            const gitExt = await this.getGitExtension();
            const repo = await this.getGitRepository(gitExt);

            // A repo is clean if there are no unstaged, staged, or merge changes
            return (
                repo.state.workingTreeChanges.length === 0 &&
                repo.state.indexChanges.length === 0 &&
                repo.state.mergeChanges.length === 0
            );
        } catch (error) {
            RovoDevLogger.error(error, 'Error checking git state');
            return true; // If we can't determine the state, assume it's clean
        }
    }
}
