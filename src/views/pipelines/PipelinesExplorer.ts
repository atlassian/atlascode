import { ConfigurationChangeEvent, commands } from 'vscode';
import { Container } from '../../container';
import { configuration } from '../../config/configuration';
import { PipelinesTree } from './PipelinesTree';
import { PipelinesTreeViewId } from '../../constants';
import { setCommandContext, CommandContext } from '../../commandContext';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { PipelinesMonitor } from './PipelinesMonitor';
import { Commands } from '../../commands';
import { BitbucketExplorer } from '../BitbucketExplorer';
import { BaseTreeDataProvider } from '../Explorer';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';

export class PipelinesExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.RefreshPipelines, this.refresh, this),
            this.ctx.onDidChangeBitbucketContext(() => this.updateExplorerState()),
        );
    }

    viewId(): string {
        return PipelinesTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.pipelines.explorerEnabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.pipelines.monitorEnabled';
    }

    refreshConfiguration(): string {
        return 'bitbucket.pipelines.refreshInterval';
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new PipelinesTree();
    }

    newMonitor(): BitbucketActivityMonitor {
        const repos = this.ctx.getBitbucketCloudRepositories();
        return new PipelinesMonitor(repos);
    }

    async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.pipelines.explorerEnabled')) {
            this.updateExplorerState();
        }
    }

    private updateExplorerState() {
        const hasCloudRepos = this.ctx.getBitbucketCloudRepositories().length > 0;
        setCommandContext(
            CommandContext.PipelineExplorer,
            Container.config.bitbucket.pipelines.explorerEnabled && hasCloudRepos,
        );
    }
}
