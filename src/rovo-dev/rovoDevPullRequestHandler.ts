import { exec } from 'child_process';
import { RovoDevLogger } from 'src/logger';
import { API, GitExtension, Repository } from 'src/typings/git';
import { promisify } from 'util';
import { env, extensions, Uri } from 'vscode';

export class RovoDevPullRequestHandler {
    private readonly gitExtensionPromise: Thenable<GitExtension>;
    private gitApiCache: API | undefined;

    constructor() {
        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension) {
            throw new Error('vscode.git extension not found');
        }

        this.gitExtensionPromise = gitExtension.activate();
    }

    private async getGitAPI(): Promise<API> {
        if (!this.gitApiCache) {
            const gitExt = await this.gitExtensionPromise;
            this.gitApiCache = gitExt.getAPI(1);
        }

        return this.gitApiCache;
    }

    private async getGitRepository(): Promise<Repository> {
        const gitApi = await this.getGitAPI();

        if (gitApi.repositories.length === 0) {
            throw new Error('No Git repositories found');
        }

        // TODO: what do we want to do in case of multiple repositories?
        return gitApi.repositories[0];
    }

    private findPRLink(output: string): string | undefined {
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
    public async createPR(branchName: string, commitMessage?: string): Promise<string | undefined> {
        const repo = await this.getGitRepository();
        await repo.fetch();

        const hasUncommitted = await this.hasUncommittedChanges();
        if (hasUncommitted) {
            if (!commitMessage || commitMessage.trim() === '') {
                throw new Error('Commit message is required when you have uncommitted changes.');
            }

            const curBranch = repo.state.HEAD?.name;
            if (curBranch !== branchName) {
                await repo.createBranch(branchName, true);
            }

            try {
                await repo.commit(commitMessage, {
                    all: true,
                });
                RovoDevLogger.info(`Successfully committed changes with message: "${commitMessage}"`);
            } catch (error) {
                RovoDevLogger.error(error, 'Failed to commit changes');
                throw new Error(`Failed to commit changes: ${error.message || 'Unknown error'}`);
            }
        } else {
            const hasUnpushed = await this.hasUnpushedCommits();
            if (!hasUnpushed) {
                throw new Error('No changes to create PR. Please make changes or commit them first.');
            }

            const curBranch = repo.state.HEAD?.name;
            if (curBranch !== branchName) {
                try {
                    await repo.createBranch(branchName, true);
                } catch (error) {
                    RovoDevLogger.error(error, `Failed to create/switch to branch: ${branchName}`);
                    throw new Error(`Failed to switch to branch "${branchName}": ${error.message || 'Unknown error'}`);
                }
            }
        }

        const execAsync = promisify(exec);
        let stderr: string;
        try {
            const result = await execAsync(`git push origin ${branchName}`, {
                cwd: repo.rootUri.fsPath,
            });
            stderr = result.stderr;
            RovoDevLogger.info(`Successfully pushed to origin/${branchName}`);
        } catch (error) {
            RovoDevLogger.error(error, 'Failed to push changes');
            const errorMessage = error.stderr || error.message || 'Unknown error';

            if (errorMessage.includes('no upstream branch')) {
                throw new Error(
                    `Branch "${branchName}" has no upstream. Try: git push --set-upstream origin ${branchName}`,
                );
            } else if (errorMessage.includes('rejected')) {
                throw new Error('Push was rejected. The remote branch may have changes you need to pull first.');
            } else if (errorMessage.includes('permission denied') || errorMessage.includes('Authentication failed')) {
                throw new Error('Push failed: Authentication error. Please check your Git credentials.');
            }

            throw new Error(`Failed to push changes: ${errorMessage}`);
        }

        const prLink = this.findPRLink(stderr);
        if (prLink) {
            env.openExternal(Uri.parse(prLink));
            RovoDevLogger.info(`Found PR link: ${prLink}`);
        } else {
            RovoDevLogger.info('No PR link found in push output. Changes pushed successfully.');
        }

        return prLink;
    }

    public async getCurrentBranchName(): Promise<string | undefined> {
        const repo = await this.getGitRepository();
        return repo.state.HEAD?.name;
    }

    private async hasUncommittedChanges(): Promise<boolean> {
        try {
            const repo = await this.getGitRepository();
            return (
                repo.state.workingTreeChanges.length > 0 ||
                repo.state.indexChanges.length > 0 ||
                repo.state.mergeChanges.length > 0
            );
        } catch (error) {
            RovoDevLogger.error(error, 'Error checking for uncommitted changes');
            return false;
        }
    }

    private async hasUnpushedCommits(): Promise<boolean> {
        try {
            const repo = await this.getGitRepository();
            return !!repo.state.HEAD?.ahead && repo.state.HEAD.ahead > 0;
        } catch (error) {
            RovoDevLogger.error(error, 'Error checking for unpushed commits');
            return false;
        }
    }

    public async hasChangesOrUnpushedCommits(): Promise<boolean> {
        try {
            const repo = await this.getGitRepository();
            await repo.status();

            return (await this.hasUncommittedChanges()) || (await this.hasUnpushedCommits());
        } catch (error) {
            RovoDevLogger.error(error, 'Error checking git changes and unpushed commits');
            return false;
        }
    }
}
