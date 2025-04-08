import path from 'path';
import { commands, ConfigurationChangeEvent, QuickPickItem, window } from 'vscode';

import { startIssueCreationEvent } from '../../analytics';
import { ProductBitbucket } from '../../atlclients/authInfo';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { BitbucketSite } from '../../bitbucket/model';
import { CommandContext, setCommandContext } from '../../commandContext';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { BitbucketIssuesTreeViewId } from '../../constants';
import { Container } from '../../container';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';
import { BitbucketExplorer } from '../BitbucketExplorer';
import { BitbucketIssuesDataProvider } from '../bitbucketIssuesDataProvider';
import { BaseTreeDataProvider } from '../Explorer';
import { BitbucketIssuesMonitor } from './bbIssuesMonitor';

export class BitbucketIssuesExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.BitbucketIssuesRefresh, this.refresh, this),
            commands.registerCommand(Commands.CreateBitbucketIssue, (source?: string) => {
                this.pickRepoAndShowCreateIssueOptions();

                startIssueCreationEvent(source || 'explorer', ProductBitbucket).then((e) => {
                    Container.analyticsClient.sendTrackEvent(e);
                });
            }),
            this.ctx.onDidChangeBitbucketContext(() => this.updateExplorerState()),
        );
    }

    private pickRepoAndShowCreateIssueOptions(): void {
        const options = Container.bitbucketContext
            .getBitbucketCloudRepositories()
            .map((repo) => ({ label: path.basename(repo.rootUri), value: repo.mainSiteRemote.site! }));

        if (options.length === 1) {
            Container.createBitbucketIssueWebviewFactory.createOrShow(options[0].value);
            return;
        }
        const picker = window.createQuickPick<QuickPickItem & { value: BitbucketSite }>();
        picker.items = options;
        picker.title = 'Create Bitbucket Issue';

        picker.placeholder =
            options.length > 0 ? 'Pick a repository' : 'No Bitbucket repositories found in this workspace';

        picker.onDidAccept(() => {
            if (picker.selectedItems.length > 0) {
                Container.createBitbucketIssueWebviewFactory.createOrShow(picker.selectedItems[0].value);
            }
            picker.hide();
        });

        picker.show();
    }

    viewId(): string {
        return BitbucketIssuesTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.issues.explorerEnabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.issues.monitorEnabled';
    }

    refreshConfiguration(): string {
        return 'bitbucket.issues.refreshInterval';
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new BitbucketIssuesDataProvider(this.ctx);
    }

    newMonitor(): BitbucketActivityMonitor {
        const repos = this.ctx.getBitbucketCloudRepositories();
        return new BitbucketIssuesMonitor(repos);
    }

    async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.issues.explorerEnabled')) {
            this.updateExplorerState();
        }
    }

    private updateExplorerState() {
        const hasCloudRepos = this.ctx.getBitbucketCloudRepositories().length > 0;
        setCommandContext(
            CommandContext.BitbucketIssuesExplorer,
            Container.config.bitbucket.issues.explorerEnabled && hasCloudRepos,
        );
    }
}
