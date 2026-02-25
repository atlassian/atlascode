import { ConfigurationChangeEvent, Disposable } from 'vscode';
import * as vscode from 'vscode';

import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { configuration } from '../config/configuration';
import { Commands } from '../constants';
import { BitbucketEnabledKey } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { FocusEvent, FocusEventActions } from '../webview/ExplorerFocusManager';
import { BitbucketActivityMonitor } from './BitbucketActivityMonitor';
import { BaseTreeDataProvider, Explorer } from './Explorer';
import { CreatePullRequestNode } from './pullrequest/headerNode';
import { DescriptionNode, PullRequestTitlesNode } from './pullrequest/pullRequestNode';
import { PullRequestNodeDataProvider } from './pullRequestNodeDataProvider';
import { RefreshTimer } from './RefreshTimer';

export abstract class BitbucketExplorer extends Explorer implements Disposable {
    private _disposable: Disposable;

    private monitor: BitbucketActivityMonitor | undefined;
    private _refreshTimer: RefreshTimer;

    constructor(protected ctx: BitbucketContext) {
        super(() => this.dispose());

        Container.context.subscriptions.push(configuration.onDidChange(this._onConfigurationChanged, this));

        this._refreshTimer = new RefreshTimer(this.explorerEnabledConfiguration(), this.refreshConfiguration(), () =>
            this.refresh(),
        );
        this._disposable = Disposable.from(
            this.ctx.onDidChangeBitbucketContext(() => {
                this.onBitbucketContextChanged();
            }),
            Container.explorerFocusManager.onFocusEvent(this.handleFocusEvent, this),
            this._refreshTimer,
        );

        this._onConfigurationChanged(configuration.initializingChangeEvent);
    }

    abstract explorerEnabledConfiguration(): string;
    bitbucketEnabledConfiguration(): string {
        return BitbucketEnabledKey;
    }

    abstract monitorEnabledConfiguration(): string;
    abstract refreshConfiguration(): string;

    abstract onConfigurationChanged(e: ConfigurationChangeEvent): void;
    abstract newTreeDataProvider(): BaseTreeDataProvider;
    abstract newMonitor(): BitbucketActivityMonitor;

    product() {
        return ProductBitbucket;
    }

    onBitbucketContextChanged() {
        this.updateMonitor();
    }

    async refresh() {
        // Only refresh if user has authenticated Bitbucket sites
        // This prevents API calls with bad/missing credentials
        const validAuthInfos = await Container.credentialManager.getAllValidAuthInfo(ProductBitbucket);
        if (validAuthInfos.length === 0) {
            Logger.debug('Skipping Bitbucket refresh - no authenticated Bitbucket sites');
            return;
        }

        if (this.treeDataProvider) {
            this.treeDataProvider.refresh();
        }
        if (this.monitor && configuration.get<boolean>(this.bitbucketEnabledConfiguration())) {
            this.monitor.checkForNewActivity();
        }
    }

    override dispose() {
        super.dispose();
        this._disposable.dispose();
    }

    private async _onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, this.explorerEnabledConfiguration())) {
            if (this.treeDataProvider) {
                this.treeDataProvider.dispose();
            }
            if (!configuration.get<boolean>(this.explorerEnabledConfiguration())) {
                this.treeDataProvider = undefined;
            } else {
                this.treeDataProvider = this.newTreeDataProvider();
            }
            this.newTreeView();
        }

        if (
            initializing ||
            configuration.changed(e, this.monitorEnabledConfiguration()) ||
            configuration.changed(e, this.explorerEnabledConfiguration())
        ) {
            this.updateMonitor();
        }

        if (configuration.changed(e, 'bitbucket.preferredRemotes')) {
            this.treeDataProvider?.refresh();
        }

        this.onConfigurationChanged(e);
    }

    async attemptDetailsNodeExpansionNTimes(remainingAttempts: number, delay: number, openNode: boolean) {
        const dataProvider = this.getDataProvider();
        if (remainingAttempts === 0) {
            if (dataProvider && dataProvider instanceof PullRequestNodeDataProvider) {
                const forceFocusedNode = await dataProvider.getFirstPullRequestNode(true);
                this.reveal(forceFocusedNode!, { focus: true });
            }
        }

        setTimeout(async () => {
            let prNode: PullRequestTitlesNode | undefined;
            if (dataProvider && dataProvider instanceof PullRequestNodeDataProvider) {
                prNode = (await dataProvider.getFirstPullRequestNode(false)) as PullRequestTitlesNode;
            }
            if (prNode) {
                this.reveal(prNode, { focus: true, expand: true });
                const detailsNode: DescriptionNode = await (dataProvider as PullRequestNodeDataProvider).getDetailsNode(
                    prNode,
                );
                this.reveal(detailsNode, { focus: true });
                if (openNode) {
                    const commandObj = detailsNode.getTreeItem().command;
                    if (commandObj) {
                        vscode.commands.executeCommand(commandObj.command, ...(commandObj.arguments ?? []));
                    }
                }
            } else {
                await this.attemptDetailsNodeExpansionNTimes(remainingAttempts - 1, delay, openNode);
            }
        }, delay);
    }

    async attemptCreatePRNodeExpansionNTimes(remainingAttempts: number, delay: number, openNode: boolean) {
        const dataProvider = this.getDataProvider();
        if (remainingAttempts === 0) {
            if (dataProvider && dataProvider instanceof PullRequestNodeDataProvider) {
                const forceFocusedNode = await dataProvider.getCreatePullRequestNode(true);
                this.reveal(forceFocusedNode!, { focus: true });
            }
        }

        setTimeout(async () => {
            let createPRNode: CreatePullRequestNode | undefined;
            if (dataProvider && dataProvider instanceof PullRequestNodeDataProvider) {
                createPRNode = (await dataProvider.getCreatePullRequestNode(false)) as CreatePullRequestNode;
            }
            if (createPRNode) {
                this.reveal(createPRNode, { focus: true });
                if (openNode) {
                    vscode.commands.executeCommand(Commands.CreatePullRequest);
                }
            } else {
                await this.attemptDetailsNodeExpansionNTimes(remainingAttempts - 1, delay, openNode);
            }
        }, delay);
    }

    async handleFocusEvent(e: FocusEvent) {
        //We attempt to expand the node 3 times with 1000ms delays in between. This is because after sites change, the PR explorer wipes its nodes and replaces them with simple nodes.
        //Only after it fetches data do those get replaced with useful nodes, but as of right now there doesn't appear to be a good way of detecting when new data is fetched, so
        //we make a few attempts at expanding the node in hopes that it will have been fetched by that time.
        if (e.action === FocusEventActions.CREATEPULLREQUEST) {
            this.attemptCreatePRNodeExpansionNTimes(3, 1000, true);
        } else if (e.action === FocusEventActions.VIEWPULLREQUEST) {
            this.attemptDetailsNodeExpansionNTimes(3, 1000, true);
        }
    }

    updateMonitor() {
        if (
            configuration.get<boolean>(this.explorerEnabledConfiguration()) &&
            configuration.get<boolean>(this.monitorEnabledConfiguration())
        ) {
            this.monitor = this.newMonitor();
        } else {
            this.monitor = undefined;
        }
    }
}
