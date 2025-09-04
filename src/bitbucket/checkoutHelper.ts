import { commands, Memento, QuickPickItem, window } from 'vscode';

import { Commands } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { checkout } from '../views/pullrequest/gitActions';
import { bitbucketSiteForRemote, clientForHostname } from './bbUtils';
import { CheckoutHelper } from './interfaces';
import { WorkspaceRepo } from './model';

type RefInfo = {
    timestamp: number;
    cloneUrl: string;
    refName: string;
    refType: string;
    sourceCloneUrl?: string;
};

const emptyRefInfo = {
    timestamp: 0,
    cloneUrl: '',
    refName: '',
    refType: '',
};

const BitbucketRefInfoKey = 'bitbucket.checkoutRef';
const RefInfoLifespanMs = 60 * 1000;

/**
 * Methods for checking out branches and pulling repos given their urls and ref names.
 */
export class BitbucketCheckoutHelper implements CheckoutHelper {
    constructor(private globalState: Memento) {}

    public async checkoutRef(
        cloneUrl: string,
        ref: string,
        refType: string,
        sourceCloneUrl?: string,
    ): Promise<boolean> {
        sourceCloneUrl = sourceCloneUrl || '';
        const wsRepo = this.findRepoInCurrentWorkspace(cloneUrl);
        if (!wsRepo) {
            this.globalState.update(BitbucketRefInfoKey, {
                timestamp: new Date().getTime(),
                cloneUrl: cloneUrl,
                refName: ref,
                refType: refType,
                sourceCloneUrl: sourceCloneUrl,
            });
            await window
                .showInformationMessage(
                    `To checkout ref ${ref}: this repository must be cloned in this workspace`,
                    'Clone Repo',
                )
                .then(async (userChoice) => {
                    if (userChoice === 'Clone Repo') {
                        await this.showCloneOptions(cloneUrl);
                    }
                });

            return false;
        }

        if (!wsRepo.mainSiteRemote.site) {
            // Maybe not a not a Bitbucket repo
            throw new Error(
                `Could not tie ${wsRepo.mainSiteRemote.remote.name} to a BitbucketSite object. Is this a Bitbucket repo?`,
            );
        }

        const success = await checkout(wsRepo, ref, sourceCloneUrl);
        // Checkout error-messaging is already handled in checkout() function
        if (success) {
            this.showCheckoutSuccessMessage(ref, refType);
        }

        return success;
    }

    /**
     * If the user clicks a URL to check out a branch but that repo isn't checked out the extension will reload itself
     * as part of the process of opening the repo. Call this method on startup to check to see if we should check out
     * a branch.
     */
    public async completeBranchCheckOut() {
        // Try to find the repo again after cloning

        const refInfo = this.globalState.get<RefInfo>(BitbucketRefInfoKey, emptyRefInfo);
        if (refInfo.refName && refInfo.timestamp) {
            const now = new Date().getTime();
            if (now - refInfo.timestamp < RefInfoLifespanMs) {
                const wsRepo = this.findRepoInCurrentWorkspace(refInfo.cloneUrl);
                if (!wsRepo) {
                    this.showLoginMessage(
                        `Could not find repo in current workspace after attempting to clone. Are you authenticated with Bitbucket?`,
                    );
                    return;
                }
                const success = await checkout(wsRepo, refInfo.refName, refInfo.sourceCloneUrl || '');
                if (success) {
                    this.showCheckoutSuccessMessage(refInfo.refName, refInfo.refType);
                }
            } else {
                Logger.debug("RefInfo found in globalState but it's stale.");
            }
            this.globalState.update(BitbucketRefInfoKey, emptyRefInfo);
        }
    }

    public async cloneRepository(repoUrl: string) {
        const wsRepo = this.findRepoInCurrentWorkspace(repoUrl);
        if (wsRepo !== undefined) {
            window.showInformationMessage(
                `Skipped cloning. Repository is open in this workspace already: ${wsRepo.rootUri}`,
            );
        } else {
            this.showCloneOptions(repoUrl);
        }
    }

    public async pullRequest(repoUrl: string, pullRequestId: number) {
        try {
            const site = bitbucketSiteForRemote({
                name: '',
                fetchUrl: repoUrl,
                isReadOnly: true,
            })!;

            const client = await clientForHostname('bitbucket.org');
            const pr = await client.pullrequests.getById(site, pullRequestId);
            const wsRepo = this.findRepoInCurrentWorkspace(repoUrl);
            Container.pullRequestDetailsWebviewFactory.createOrShow(pr.data.url, {
                ...pr,
                workspaceRepo: wsRepo,
            });
        } catch (e) {
            Logger.error(e, 'Error opening pull request');
            this.showLoginMessage(
                'Cannot open pull request. Authenticate with Bitbucket in the extension settings and try again.',
            );
            commands.executeCommand(Commands.ShowBitbucketAuth);
        }
    }

    private showCheckoutSuccessMessage(refName: string, refType: string) {
        if (refType === 'branch') {
            window.showInformationMessage(`Branch ${refName} successfully checked out`);
        } else {
            window.showInformationMessage(`${refName} successfully checked out`);
        }
    }

    private showLoginMessage(prompt: string) {
        window.showInformationMessage(prompt, 'Open auth settings').then((userChoice) => {
            if (userChoice === 'Open auth settings') {
                commands.executeCommand(Commands.ShowBitbucketAuth);
            }
        });
    }

    private findRepoInCurrentWorkspace(repoUrl: string): WorkspaceRepo | undefined {
        return Container.bitbucketContext.getBitbucketCloudRepositories().find((wsRepo) => {
            const site = wsRepo.mainSiteRemote.site!;
            const fullName = `${site.ownerSlug}/${site.repoSlug}`;
            return repoUrl.includes(fullName);
        });
    }

    private async showCloneOptions(repoUrl: string) {
        const options: (QuickPickItem & { action: () => Promise<void> })[] = [
            {
                label: 'Clone a new copy',
                action: async () => {
                    await commands.executeCommand(Commands.CloneRepository, 'uriHandler', repoUrl);
                },
            },
            {
                label: 'Add an existing folder to this workspace',
                action: async () => commands.executeCommand(Commands.WorkbenchOpenRepository, 'uriHandler'),
            },
            {
                label: 'Open repository in an different workspace',
                action: async () => commands.executeCommand(Commands.WorkbenchOpenWorkspace, 'uriHandler'),
            },
        ];

        await window.showQuickPick(options).then(async (selection) => {
            await selection?.action();
        });
    }
}
