import { commands, window } from 'vscode';

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
        window.showInformationMessage(`Error checking out the pull request branch: no workspace repo`, `Dismiss`);
        Logger.error(new Error('Error checking out the pull request branch: no workspace repo'));
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
            return window
                .showInformationMessage(
                    `Checkout Failed: You have uncommitted changes`,
                    'Stash changes and try again',
                    'Dismiss',
                )
                .then(async (userChoice) => {
                    if (userChoice === 'Stash changes and try again') {
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
    // First, check if a remote with this exact name exists
    const existingByName = await scm
        .getConfig(`remote.${name}.url`)
        .then((url) => (url ? name : undefined))
        .catch((_) => undefined);

    if (existingByName) {
        // Remote with this name already exists, use it
        await scm.fetch(existingByName, ref);
        return;
    }

    // Check if any existing remote points to the same repository
    const existingByUrl = findRemoteByRepoUrl(scm, fetchUrl);

    if (existingByUrl) {
        // Reuse existing remote instead of creating duplicate
        await scm.fetch(existingByUrl, ref);
        return;
    }

    // No existing remote found, create new one
    await scm.addRemote(name, fetchUrl);
    await scm.fetch(name, ref);
}

/**
 * Finds an existing remote that points to the same repository as the given URL.
 * Compares based on hostname and owner/repo path, ignoring protocol differences.
 *
 * @param scm Git repository instance
 * @param targetUrl URL to search for
 * @returns Existing remote name if found, undefined otherwise
 */
function findRemoteByRepoUrl(scm: Repository, targetUrl: string): string | undefined {
    const targetParsed = parseGitUrl(targetUrl);

    for (const remote of scm.state.remotes) {
        const remoteUrl = urlForRemote(remote);
        if (!remoteUrl) {
            continue;
        }

        try {
            const remoteParsed = parseGitUrl(remoteUrl);

            // Compare by resource (hostname) and full_name (owner/repo)
            if (remoteParsed.resource === targetParsed.resource && remoteParsed.full_name === targetParsed.full_name) {
                return remote.name;
            }
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            // Skip remotes with unparseable URLs
            continue;
        }
    }

    return undefined;
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
