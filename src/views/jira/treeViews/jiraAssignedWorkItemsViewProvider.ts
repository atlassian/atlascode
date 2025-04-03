import { ProductJira } from '../../../atlclients/authInfo';
import { Container } from '../../../container';
import { Commands } from '../../../commands';
import { SearchJiraHelper } from '../searchJiraHelper';
import { PromiseRacer } from '../../../util/promises';
import {
    Disposable,
    TreeDataProvider,
    TreeItem,
    EventEmitter,
    ConfigurationChangeEvent,
    TreeViewVisibilityChangeEvent,
    commands,
    window,
} from 'vscode';
import { JiraIssueNode, TreeViewIssue, executeJqlQuery, loginToJiraMessageNode } from './utils';
import { configuration } from '../../../config/configuration';
import { CommandContext, setCommandContext } from '../../../commandContext';
import { SitesAvailableUpdateEvent } from '../../../siteManager';
import { NewIssueMonitor } from '../../../jira/newIssueMonitor';
import { RefreshTimer } from '../../RefreshTimer';
import { viewScreenEvent } from '../../../analytics';

const AssignedWorkItemsViewProviderId = 'atlascode.views.jira.assignedWorkItemsTreeView';

export class AssignedWorkItemsViewProvider extends Disposable implements TreeDataProvider<TreeItem> {
    private static readonly _treeItemConfigureJiraMessage = loginToJiraMessageNode;

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _disposable: Disposable;
    private _initPromises: PromiseRacer<TreeViewIssue[]> | undefined;
    private _initChildren: TreeItem[] = [];
    private _newIssueMonitor: NewIssueMonitor;

    constructor() {
        super(() => this.dispose);

        setCommandContext(CommandContext.JiraExplorer, false);
        setCommandContext(CommandContext.AssignedIssueExplorer, Container.config.jira.explorer.enabled);

        const treeView = window.createTreeView(AssignedWorkItemsViewProviderId, { treeDataProvider: this });
        treeView.onDidChangeVisibility((e) => this.onDidChangeVisibility(e));

        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh()),
            commands.registerCommand(Commands.RefreshAssignedWorkItemsExplorer, this.refresh, this),
            treeView,
        );

        this._newIssueMonitor = new NewIssueMonitor(() => Container.jqlManager.getAllDefaultJQLEntries());

        const jqlEntries = Container.jqlManager.getAllDefaultJQLEntries();
        if (jqlEntries.length) {
            this._initPromises = new PromiseRacer(jqlEntries.map(executeJqlQuery));
        }

        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
        this._onDidChangeTreeData.fire();
    }

    private async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent): Promise<void> {
        if (event.visible && Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            viewScreenEvent(AssignedWorkItemsViewProviderId, undefined, ProductJira).then((e) => {
                Container.analyticsClient.sendScreenEvent(e);
            });
        }
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent): void {
        if (configuration.changed(e, 'jira.explorer.enabled')) {
            setCommandContext(CommandContext.AssignedIssueExplorer, Container.config.jira.explorer.enabled);
            this.refresh();
        } else if (configuration.changed(e, 'jira.explorer')) {
            this.refresh();
        }
    }

    private onSitesDidChange(e: SitesAvailableUpdateEvent): void {
        if (e.product.key === ProductJira.key) {
            this.refresh();
        }
    }

    public dispose(): void {
        this._disposable.dispose();
    }

    private refresh(): void {
        this._newIssueMonitor.checkForNewIssues();
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    public async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        // this branch should never be triggered
        if (element) {
            return [];
        }
        // this branch triggers during initialization, aka first fetch of all default JQLs
        else if (this._initPromises && !this._initPromises.isEmpty()) {
            // To let the "blue progress bar" active, this method should return a pending Promise.
            // Once the promise resolves, the children are retrieved and the progress bar stops.
            // So, in order to implement a progressive loading while the progress bar keep running,
            // we have implemented this hack:
            // - use a PromiseRacer to retrieve the next resolved JQL promise (loop until there is one with data)
            // - append the data to `this._children` and resolve this promise returning it
            // - if there are still JQL promises in PromiseRacer, trigger another DidChangeTreeData immediately
            //   which will stay pending until the next JQL promise with data resolves, or until all JQL promises are done

            while (!this._initPromises.isEmpty()) {
                const issues = await this._initPromises.next();
                if (!issues.length) {
                    continue;
                }

                SearchJiraHelper.appendIssues(issues, AssignedWorkItemsViewProviderId);
                this._initChildren.push(...this.buildTreeItemsFromIssues(issues));
                break;
            }

            if (!this._initPromises.isEmpty()) {
                // need to trigger a DidChangeTreeData after this method ends - 10ms as a small-enough timeout
                setTimeout(() => this._onDidChangeTreeData.fire(), 10);
            }

            return this._initChildren;
        }
        // this branch triggers when refresing an already rendered panel
        else {
            const jqlEntries = Container.jqlManager.getAllDefaultJQLEntries();
            if (!jqlEntries.length) {
                return [AssignedWorkItemsViewProvider._treeItemConfigureJiraMessage];
            }

            const allIssues = (await Promise.all(jqlEntries.map(executeJqlQuery))).flat();
            SearchJiraHelper.setIssues(allIssues, AssignedWorkItemsViewProviderId);
            return this.buildTreeItemsFromIssues(allIssues);
        }
    }

    private buildTreeItemsFromIssues(issues?: TreeViewIssue[]): TreeItem[] {
        return issues
            ? issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.JiraAssignedIssuesNode, issue))
            : [];
    }
}
