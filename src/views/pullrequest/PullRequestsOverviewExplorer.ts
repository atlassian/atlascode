import { commands, ConfigurationChangeEvent } from 'vscode';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { CommandContext, setCommandContext } from '../../commandContext';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { PullRequestsOverviewTreeViewId } from '../../constants';
import { Container } from '../../container';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';
import { BitbucketExplorer } from '../BitbucketExplorer';
import { BaseTreeDataProvider } from '../Explorer';
import { PullRequestsOverviewNodeDataProvider } from '../pullRequestOverviewNodeDataProvider';

export class PullRequestsOverviewExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
            commands.registerCommand(Commands.BitbucketPullRequestsOverviewRefresh, this.refresh, this),
            this.ctx.onDidChangeBitbucketContext(() => this.updateExplorerState()),
        );
    }

    viewId(): string {
        return PullRequestsOverviewTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.explorer.pullRequestsOverview.enabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.explorer.pullRequestsOverview.enabled';
    }

    refreshConfiguration(): string {
        return 'bitbucket.explorer.pullRequestsOverview.refreshInterval';
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new PullRequestsOverviewNodeDataProvider();
    }

    newMonitor(): BitbucketActivityMonitor {
        return {
            checkForNewActivity(): void {
                // No-op for now
            },
        };
    }

    override async refresh(): Promise<void> {
        if (this.treeDataProvider) {
            this.treeDataProvider.refresh();
        }
    }

    async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.pullRequestsOverview.enabled')) {
            this.updateExplorerState();
        }

        if (configuration.changed(e, 'bitbucket.explorer.pullRequestsOverview.workspace')) {
            this.refresh();
        }
    }

    private updateExplorerState() {
        setCommandContext(
            CommandContext.PullRequestOverviewEnabled,
            Container.config.bitbucket.explorer.pullRequestsOverview,
        );
    }
}
