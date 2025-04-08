import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { FocusEvent } from 'src/webview/ExplorerFocusManager';
import { commands, ConfigurationChangeEvent, Disposable } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { CommandContext, setCommandContext } from '../../commandContext';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { CustomJQLTreeId } from '../../constants';
import { Container } from '../../container';
import { NewIssueMonitor } from '../../jira/newIssueMonitor';
import { SitesAvailableUpdateEvent } from '../../siteManager';
import { RefreshTimer } from '../RefreshTimer';
import { CustomJQLRoot } from './customJqlRoot';
import { JiraExplorer } from './jiraExplorer';

export class JiraContext extends Disposable {
    private _explorer: JiraExplorer | undefined;
    private _disposable: Disposable;
    private _newIssueMonitor: NewIssueMonitor;
    private _refreshTimer: RefreshTimer;

    constructor() {
        super(() => this.dispose());

        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);

        this._refreshTimer = new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () =>
            this.refresh(),
        );
        this._newIssueMonitor = new NewIssueMonitor();
        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            Container.explorerFocusManager.onFocusEvent(this.handleFocusEvent, this),
            this._refreshTimer,
        );

        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'jira.explorer.enabled')) {
            if (!Container.config.jira.explorer.enabled) {
                this.dispose();
            } else {
                if (initializing || !this._explorer) {
                    this._explorer = new JiraExplorer(CustomJQLTreeId, new CustomJQLRoot());
                }
            }

            setCommandContext(CommandContext.AssignedIssueExplorer, false);
            setCommandContext(CommandContext.CustomJQLExplorer, false);
            setCommandContext(CommandContext.JiraExplorer, Container.config.jira.explorer.enabled);
        }

        if (initializing || configuration.changed(e, 'jira.explorer.showOpenIssues')) {
            setCommandContext(CommandContext.OpenIssuesTree, Container.config.jira.explorer.showOpenIssues);
        }

        if (initializing || configuration.changed(e, 'jira.explorer.showAssignedIssues')) {
            setCommandContext(CommandContext.AssignedIssuesTree, Container.config.jira.explorer.showAssignedIssues);
        }

        if (initializing) {
            const isLoggedIn = Container.siteManager.productHasAtLeastOneSite(ProductJira);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            //this._newIssueMonitor.setProject(project);
        }
    }

    async handleFocusEvent(e: FocusEvent) {
        if (this._explorer instanceof JiraExplorer) {
            this._explorer.focusEvent(e);
        }
    }

    dispose() {
        this._disposable.dispose();
        if (this._explorer) {
            this._explorer.dispose();
            this._explorer = undefined;
        }
    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() || !Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return;
        }

        await Container.jqlManager.updateFilters();

        if (this._explorer) {
            this._explorer.refresh();
        }

        this._newIssueMonitor.checkForNewIssues();
    }

    async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductJira.key) {
            if (e.newSites) {
                Container.jqlManager.initializeJQL(e.newSites);
            }
            const isLoggedIn = e.sites.length > 0;
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            this.refresh();
        }
    }

    async findIssue(issueKey: string): Promise<MinimalORIssueLink<DetailedSiteInfo> | undefined> {
        let issue: MinimalORIssueLink<DetailedSiteInfo> | undefined = undefined;
        if (this._explorer) {
            issue = await this._explorer.findIssue(issueKey);
        }

        return issue;
    }
}
