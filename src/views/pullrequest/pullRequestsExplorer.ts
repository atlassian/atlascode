import path from 'path';
import { commands, ConfigurationChangeEvent, EventEmitter, QuickPickItem, TreeItemCheckboxState, window } from 'vscode';
import { TreeView } from 'vscode';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { CommandContext, setCommandContext } from '../../commandContext';
import { configuration } from '../../config/configuration';
import { Commands, PullRequestTreeViewId } from '../../constants';
import { Container } from '../../container';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';
import { BitbucketExplorer } from '../BitbucketExplorer';
import { BaseTreeDataProvider } from '../Explorer';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { DirectoryNode } from '../nodes/directoryNode';
import { PullRequestFilesNode } from '../nodes/pullRequestFilesNode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCreatedMonitor } from './pullRequestCreatedMonitor';

export class PullRequestsExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.BitbucketRefreshPullRequests, () => this.refresh()),
            commands.registerCommand(Commands.BitbucketToggleFileNesting, () => this.toggleFileNesting()),
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr: PullRequest) => {
                await Container.pullRequestDetailsWebviewFactory.createOrShow(pr.data.url, pr);
            }),
            commands.registerCommand(Commands.CreatePullRequest, () => this.pickRepoAndShowCreatePR()),
        );
    }

    private _onDidChangeTreeData = new EventEmitter<AbstractBaseNode | undefined>();

    protected newTreeView(): TreeView<AbstractBaseNode> | undefined {
        super.newTreeView();
        this.setupCheckboxHandling();
        return this.treeView;
    }

    private setupCheckboxHandling(): void {
        if (!this.treeView) {
            return;
        }
        this.treeView.onDidChangeCheckboxState((event) => {
            event.items.forEach(([item, state]) => {
                const checked = state === TreeItemCheckboxState.Checked;
                if (item instanceof PullRequestFilesNode || item instanceof DirectoryNode) {
                    item.checked = checked;
                    this._onDidChangeTreeData.fire(item);
                }
            });
        });
    }

    private pickRepoAndShowCreatePR(): void {
        const options: (QuickPickItem & {
            value: WorkspaceRepo;
        })[] = Container.bitbucketContext
            .getBitbucketRepositories()
            .map((repo) => ({ label: path.basename(repo.rootUri), value: repo }));

        if (options.length === 1) {
            Container.createPullRequestWebviewFactory.createOrShow(options[0].value);
            return;
        }

        const picker = window.createQuickPick<QuickPickItem & { value: WorkspaceRepo }>();
        picker.items = options;
        picker.title = 'Create pull request';
        picker.placeholder =
            options.length > 0 ? 'Pick a repository' : 'No Bitbucket repositories found in this workspace';

        picker.onDidAccept(() => {
            if (picker.selectedItems.length > 0) {
                Container.createPullRequestWebviewFactory.createOrShow(picker.selectedItems[0].value);
            }
            picker.hide();
        });

        picker.show();
    }

    viewId(): string {
        return PullRequestTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.explorer.enabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.explorer.notifications.pullRequestCreated';
    }

    refreshConfiguration(): string {
        return 'bitbucket.explorer.refreshInterval';
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new PullRequestNodeDataProvider(this.ctx);
    }

    newMonitor(): BitbucketActivityMonitor {
        return new PullRequestCreatedMonitor(this.ctx);
    }

    onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.enabled')) {
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }
    }

    toggleFileNesting() {
        const isEnabled = configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled');
        configuration.updateEffective('bitbucket.explorer.nestFilesEnabled', !isEnabled, null);
        this.refresh();
    }
}
