import { commands, window, l10n } from 'vscode';
import { parseGitUrl, urlForRemote } from '../../bitbucket/bbUtils';
import { PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { Remote, Repository } from '../../typings/git';

export async function checkout(wsRepo: WorkspaceRepo, ref: string, forkCloneUrl: string): Promise<boolean> {
    await addSourceRemoteIfNeeded(wsRepo.rootUri, ref, forkCloneUrl);
    return checkoutRemote(wsRepo.rootUri, ref);
}

export async function checkoutPRBranch(pr: PullRequest, branch: string): Promise<boolean> {
    if (!pr.workspaceRepo) {
        window.showInformationMessage(
            l10n.t('Error checking out the pull request branch: no workspace repo'),
            l10n.t('Dismiss'),
        );
        Logger.error(new Error('error checking out the pull request branch: no workspace repo'));
        return false;
    }

    await addSourceRemoteIfNeededForPR(pr);
    return checkoutRemote(pr.workspaceRepo.rootUri, branch);
}

// Add source remote (if necessary) if pull request is from a fork repository
export async function addSourceRemoteIfNeededForPR(pr: PullRequest) {
    const sourceRemote = sourceRemoteForPullRequest(pr);

    if (sourceRemote && pr.workspaceRepo) {
        const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;

        await addSourceRemote(scm, sourceRemote.name, sourceRemote.fetchUrl!, pr.data.source.branchName);
    }
}

async function addSourceRemoteIfNeeded(rootUri: string, ref: string, forkCloneUrl: string) {
    if (!forkCloneUrl) {
        return;
    }

    const scm = Container.bitbucketContext.getRepositoryScm(rootUri)!;

    const parsed = parseGitUrl(forkCloneUrl);
    await addSourceRemote(scm, parsed.name, forkCloneUrl, ref);
}

async function checkoutRemote(rootUri: string, remote: string): Promise<boolean> {
    const scm = Container.bitbucketContext.getRepositoryScm(rootUri)!;
    try {
        await scm.fetch();
        await scm.checkout(remote);
        if (scm.state.HEAD?.behind) {
            scm.pull();
        }
        return true;
    } catch (e) {
        if (e.stderr.includes('Your local changes to the following files would be overwritten by checkout')) {
            const choice = l10n.t('Stash changes and try again');
            return window
                .showInformationMessage(
                    l10n.t('Checkout Failed: You have uncommitted changes'),
                    choice,
                    l10n.t('Dismiss'),
                )
                .then(async (userChoice) => {
                    if (userChoice === choice) {
                        await commands.executeCommand('git.stash');
                        return await checkoutRemote(rootUri, remote);
                    } else {
                        return false;
                    }
                });
        } else {
            window.showInformationMessage(`${e.stderr}`, `Dismiss`);
            return false;
        }
    }
}

async function addSourceRemote(scm: Repository, name: string, fetchUrl: string, ref: string) {
    await scm
        .getConfig(`remote.${name}.url`)
        .then(async (url) => {
            if (!url) {
                await scm.addRemote(name, fetchUrl!);
            }
        })
        .catch(async (_) => {
            await scm.addRemote(name, fetchUrl!);
        });

    await scm.fetch(name, ref);
}

function sourceRemoteForPullRequest(pr: PullRequest): Remote | undefined {
    if (!pr.workspaceRepo) {
        return undefined;
    }

    if (pr.data.source.repo.url === '' || pr.data.source.repo.url === pr.data.destination.repo.url) {
        return undefined;
    }

    // Build the fork repo remote url based on the following:
    // 1) The source repo url from REST API returns http URLs, and we want to use SSH protocol if the existing remotes use SSH
    // 2) We build the source remote git url from the existing remote as the SSH url may be different from http url
    const parsed = parseGitUrl(urlForRemote(pr.workspaceRepo.mainSiteRemote.remote));
    const parsedSourceRemoteUrl = parseGitUrl(pr.data.source.repo.url);
    parsed.owner = parsedSourceRemoteUrl.owner;
    parsed.name = parsedSourceRemoteUrl.name;
    parsed.full_name = parsedSourceRemoteUrl.full_name;
    return {
        fetchUrl: parsed.toString(parsed.protocol),
        // Bitbucket Server personal repositories are of the format `~username`
        // and `~` is an invalid character for git remotes
        name: pr.data.source.repo.fullName.replace('~', '__').toLowerCase(),
        isReadOnly: true,
    };
}
