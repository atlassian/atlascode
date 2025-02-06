import { commands, Memento, QuickPickItem, window, l10n } from 'vscode';
import { Commands } from '../commands';
import { Container } from '../container';
import { ConfigSection, ConfigSubSection } from '../lib/ipc/models/config';
import { Logger } from '../logger';
import { checkout } from '../views/pullrequest/gitActions';
import { bitbucketSiteForRemote, clientForHostname } from './bbUtils';
import { WorkspaceRepo } from './model';
import { CheckoutHelper } from './interfaces';

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
        let wsRepo = this.findRepoInCurrentWorkspace(cloneUrl);
        if (!wsRepo) {
            this.globalState.update(BitbucketRefInfoKey, {
                timestamp: new Date().getTime(),
                cloneUrl: cloneUrl,
                refName: ref,
                refType: refType,
                sourceCloneUrl: sourceCloneUrl,
            });
            const choice = l10n.t('Clone Repo');
            await window
                .showInformationMessage(
                    l10n.t('To checkout ref {0}: this repository must be cloned in this workspace', ref),
                    choice,
                )
                .then(async (userChoice) => {
                    if (userChoice === choice) {
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
                let wsRepo = this.findRepoInCurrentWorkspace(refInfo.cloneUrl);
                if (!wsRepo) {
                    this.showLoginMessage(
                        l10n.t(
                            'Could not find repo in current workspace after attempting to clone. Are you authenticated with Bitbucket?',
                        ),
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
                l10n.t('Skipped cloning. Repository is open in this workspace already: {0}', wsRepo.rootUri),
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
        } catch {
            this.showLoginMessage(
                l10n.t(
                    'Cannot open pull request. Authenticate with Bitbucket in the extension settings and try again.',
                ),
            );
        }
    }

    private showCheckoutSuccessMessage(refName: string, refType: string) {
        if (refType === 'branch') {
            window.showInformationMessage(l10n.t('Branch {0} successfully checked out', refName));
        } else {
            window.showInformationMessage(l10n.t('{0} successfully checked out'));
        }
    }

    private showLoginMessage(prompt: string) {
        const choice = l10n.t('Open auth settings');
        window.showInformationMessage(prompt, choice).then((userChoice) => {
            if (userChoice === choice) {
                Container.settingsWebviewFactory.createOrShow({
                    section: ConfigSection.Bitbucket,
                    subSection: ConfigSubSection.Auth,
                });
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
                label: l10n.t('Clone a new copy'),
                action: async () => {
                    await commands.executeCommand(Commands.CloneRepository, 'uriHandler', repoUrl);
                },
            },
            {
                label: l10n.t('Add an existing folder to this workspace'),
                action: async () => commands.executeCommand(Commands.WorkbenchOpenRepository, 'uriHandler'),
            },
            {
                label: l10n.t('Open repository in an different workspace'),
                action: async () => commands.executeCommand(Commands.WorkbenchOpenWorkspace, 'uriHandler'),
            },
        ];

        await window.showQuickPick(options).then(async (selection) => {
            await selection?.action();
        });
    }
}
