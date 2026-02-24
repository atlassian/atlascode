import { exec } from 'child_process';
import { Logger } from 'src/logger';
import { API, GitErrorCodes, GitExtension, Repository } from 'src/typings/git';
import { promisify } from 'util';
import { env, extensions, Uri } from 'vscode';

import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

const execAsync = promisify(exec);

export class RovoDevPullRequestHandler {
    private readonly gitExtensionPromise: Thenable<GitExtension>;
    private gitApiCache: API | undefined;

    constructor() {
        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension) {
            const error = new Error('vscode.git extension not found');
            RovoDevTelemetryProvider.logError(error, 'Git extension not available');
            throw error;
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
            const error = new Error('No Git repositories found');
            RovoDevTelemetryProvider.logError(error, 'No Git repositories in workspace');
            throw error;
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
            // Internal staging instance of Bitbucket
            /https:\/\/integration\.bb-inf\.net\/[^\s]+\/pull-requests\/new\?[^\s]+/g,
            // Generic
            /https:\/\/[^\s]+\/pull[^\s]*\/new\/[^\s]+/g,
        ];

        for (const matcher of linkMatchers) {
            const match = output.match(matcher);
            if (match && match[0]) {
                Logger.info(`Create PR: ${match[0]}`);
                return match[0];
            }
        }

        Logger.info(`Could not find PR link in push output.`);
        Logger.info(`Push warnings: ${output}`);
        return undefined;
    }

    public buildCreatePrLinkFromGitOutput(output: string, branch: string): string | undefined {
        // If no PR creation link found, try to extract one from the git remote URL
        // example text: "To bitbucket.org:atlassian/devai-services.git"
        const gitRemoteMatchers = [
            // SSH Github: git@github.com:my-org/my-repo.git
            /(github)\.com:([^\s]+)\/([^\s]+)(\.git)?/,
            // SSH Bitbucket:
            /(bitbucket)\.org:([^\s]+)\/([^\s]+)(\.git)?/,
            // Internal staging instance of Bitbucket
            /(integration\.bb-inf)\.net:([^\s]+)\/([^\s]+)(\.git)?/,
        ];
        for (const gitRemoteMatcher of gitRemoteMatchers) {
            const gitRemoteMatch = output.match(gitRemoteMatcher);
            if (gitRemoteMatch && gitRemoteMatch[2] && gitRemoteMatch[3]) {
                const org = gitRemoteMatch[2];
                const repo = gitRemoteMatch[3].replace(/\.git$/, '');
                const host = gitRemoteMatch[1];
                if (!host) {
                    continue;
                }

                let prLink: string;
                switch (host) {
                    case 'github':
                        prLink = `https://github.com/${org}/${repo}/pull/new/${branch}`;
                        break;
                    case 'bitbucket':
                        prLink = `https://bitbucket.org/${org}/${repo}/pull-requests/new?source=${branch}`;
                        break;
                    case 'integration.bb-inf':
                        prLink = `https://integration.bb-inf.net/${org}/${repo}/pull-requests/new?source=${branch}`;
                        break;
                    default:
                        continue;
                }

                Logger.info(`Create PR from git remote: ${prLink}`);
                return prLink;
            }
        }

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
                Logger.info(`Successfully committed changes with message: "${commitMessage}"`);
            } catch (error) {
                RovoDevTelemetryProvider.logError(error, 'Failed to commit changes');

                // Check for specific git configuration errors
                const gitError = error as any;
                if (gitError.gitErrorCode === GitErrorCodes.NoUserNameConfigured) {
                    throw new Error(
                        'Failed to commit changes: Git user.name is not configured.\n\n' +
                            'Please run:\n' +
                            '  git config --global user.name "Your Name"',
                    );
                } else if (gitError.gitErrorCode === GitErrorCodes.NoUserEmailConfigured) {
                    throw new Error(
                        'Failed to commit changes: Git user.email is not configured.\n\n' +
                            'Please run:\n' +
                            '  git config --global user.email "your.email@example.com"',
                    );
                }

                throw new Error(`Failed to commit changes: ${error.message || 'Unknown error'}`);
            }
        } else {
            const hasUnpushed = await this.hasUnpushedCommits();
            if (!hasUnpushed) {
                const error = new Error('No changes to create PR. Please make changes or commit them first.');
                RovoDevTelemetryProvider.logError(error, 'No changes available for PR creation');
                throw error;
            }

            const curBranch = repo.state.HEAD?.name;
            if (curBranch !== branchName) {
                try {
                    await repo.createBranch(branchName, true);
                } catch (error) {
                    RovoDevTelemetryProvider.logError(error, `Failed to create/switch to branch: ${branchName}`);
                    throw new Error(`Failed to switch to branch "${branchName}": ${error.message || 'Unknown error'}`);
                }
            }
        }

        let stderr: string;
        try {
            const result = await execAsync(`git push origin ${branchName}`, {
                cwd: repo.rootUri.fsPath,
            });
            stderr = result.stderr;
            Logger.info(`Successfully pushed to origin/${branchName}`);
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Failed to push changes');
            const errorMessage = error.stderr || error.message || 'Unknown error';

            if (errorMessage.includes('no upstream branch')) {
                const error = new Error(
                    `Branch "${branchName}" has no upstream. Try: git push --set-upstream origin ${branchName}`,
                );
                RovoDevTelemetryProvider.logError(error, 'Git push failed: no upstream branch');
                throw error;
            } else if (errorMessage.includes('rejected')) {
                const error = new Error(
                    'Push was rejected. The remote branch may have changes you need to pull first.',
                );
                RovoDevTelemetryProvider.logError(error, 'Git push rejected by remote');
                throw error;
            } else if (errorMessage.includes('permission denied') || errorMessage.includes('Authentication failed')) {
                const error = new Error('Push failed: Authentication error. Please check your Git credentials.');
                RovoDevTelemetryProvider.logError(error, 'Git push failed: authentication error');
                throw error;
            }

            RovoDevTelemetryProvider.logError(error, 'Git push failed with unknown error');
            throw new Error(`Failed to push changes: ${errorMessage}`);
        }

        const prLink = this.findPRLink(stderr) || this.buildCreatePrLinkFromGitOutput(stderr, branchName);
        if (prLink) {
            Logger.info(`Found PR link: ${prLink}`);
            try {
                await env.openExternal(Uri.parse(prLink));
            } catch (ex) {
                Logger.info('Failed to open PR link.', ex);
            }
        } else {
            Logger.info('No PR link found in push output. Changes pushed successfully.');
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
            RovoDevTelemetryProvider.logError(error, 'Error checking for uncommitted changes');
            return false;
        }
    }

    private async hasUnpushedCommits(): Promise<boolean> {
        try {
            const repo = await this.getGitRepository();
            return !!repo.state.HEAD?.ahead && repo.state.HEAD.ahead > 0;
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error checking for unpushed commits');
            return false;
        }
    }

    public async hasChangesOrUnpushedCommits(): Promise<boolean> {
        try {
            const repo = await this.getGitRepository();
            await repo.status();

            return (await this.hasUncommittedChanges()) || (await this.hasUnpushedCommits());
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error checking git changes and unpushed commits');
            return false;
        }
    }
}
