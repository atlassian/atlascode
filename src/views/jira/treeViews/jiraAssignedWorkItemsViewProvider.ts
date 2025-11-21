import timer from 'src/util/perf';
import {
    CancellationToken,
    commands,
    ConfigurationChangeEvent,
    DataTransfer,
    DataTransferItem,
    Disposable,
    EventEmitter,
    ThemeIcon,
    TreeDataProvider,
    TreeDragAndDropController,
    TreeItem,
    TreeItemCollapsibleState,
    TreeViewVisibilityChangeEvent,
    window,
} from 'vscode';

import { viewScreenEvent } from '../../../analytics';
import { performanceEvent } from '../../../analytics';
import { ProductJira } from '../../../atlclients/authInfo';
import { CommandContext, setCommandContext } from '../../../commandContext';
import { configuration } from '../../../config/configuration';
import { AssignedJiraItemsViewId, Commands } from '../../../constants';
import { Container } from '../../../container';
import { SitesAvailableUpdateEvent } from '../../../siteManager';
import { PromiseRacer } from '../../../util/promises';
import { BadgeDelegate } from '../../notifications/badgeDelegate';
import { JiraNotifier } from '../../notifications/jiraNotifier';
import { RefreshTimer } from '../../RefreshTimer';
import { SearchJiraHelper } from '../searchJiraHelper';
import { executeJqlQuery, JiraIssueNode, loginToJiraMessageNode, TreeViewIssue } from './utils';

const AssignedWorkItemsViewProviderId = AssignedJiraItemsViewId;
const RefreshCumulativeJqlFetchEventName = 'ui.jira.jqlFetch.update.lcp';
const InitialCumulativeJqlFetchEventName = 'ui.jira.jqlFetch.render.lcp';

class AssigneeGroupNode extends TreeItem {
    private readonly _children: JiraIssueNode[];

    constructor(assigneeName: string, issueCount: number, issues: TreeViewIssue[]) {
        super(`${assigneeName} (${issueCount})`, TreeItemCollapsibleState.Expanded);
        this.iconPath = ThemeIcon.Folder;
        this.tooltip = `${assigneeName} - ${issueCount} issue${issueCount !== 1 ? 's' : ''}`;
        this._children = issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.JiraAssignedIssuesNode, issue));
    }

    getChildren(): TreeItem[] {
        return this._children;
    }
}

export class AssignedWorkItemsViewProvider
    extends Disposable
    implements TreeDataProvider<TreeItem>, TreeDragAndDropController<TreeItem>
{
    dropMimeTypes = [];
    dragMimeTypes = [];

    private static readonly _treeItemConfigureJiraMessage = loginToJiraMessageNode;

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private readonly _disposable: Disposable;
    private readonly _initPromises: PromiseRacer<TreeViewIssue[]> | undefined;
    private readonly _initChildren: TreeItem[] = [];
    private readonly _jiraNotifier = new JiraNotifier();

    private _skipNotificationForNextFetch = false;
    private _filteredIssues: TreeViewIssue[] | null = null;
    private _filteredIssuesResolve: ((value: TreeItem[]) => void) | null = null;
    private _selectedUsersCount = 0;

    constructor() {
        super(() => this.dispose());

        setCommandContext(CommandContext.AssignedIssueExplorer, Container.config.jira.explorer.enabled);

        const treeView = window.createTreeView(AssignedWorkItemsViewProviderId, {
            treeDataProvider: this,
            dragAndDropController: this,
        });

        BadgeDelegate.initialize(treeView);

        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh()),
            commands.registerCommand(Commands.RefreshAssignedWorkItemsExplorer, this.refresh, this),
            treeView.onDidChangeVisibility((e) => this.onDidChangeVisibility(e)),
            treeView,
        );

        const jqlEntries = Container.jqlManager.getAllDefaultJQLEntries();
        if (jqlEntries.length) {
            timer.mark(InitialCumulativeJqlFetchEventName);
            const promises = jqlEntries.map(executeJqlQuery);
            this._initPromises = new PromiseRacer(promises);
            Promise.all(promises).then(() => {
                const jqlInitialDuration = timer.measureAndClear(InitialCumulativeJqlFetchEventName);
                performanceEvent(InitialCumulativeJqlFetchEventName, jqlInitialDuration).then((event) => {
                    Container.analyticsClient.sendTrackEvent(event);
                });
            });
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
            this.refreshWithoutNotifications();
        } else if (configuration.changed(e, 'jira.explorer')) {
            this.refreshWithoutNotifications();
        }
    }

    private onSitesDidChange(e: SitesAvailableUpdateEvent): void {
        if (e.product.key === ProductJira.key) {
            this.refreshWithoutNotifications();
        }
    }

    public focus(): void {
        commands.executeCommand(`${AssignedWorkItemsViewProviderId}.focus`, {});
    }

    public setFilteredIssues(issues: TreeViewIssue[] | null, selectedUsersCount?: number): void {
        this._filteredIssues = issues;
        if (selectedUsersCount !== undefined) {
            this._selectedUsersCount = selectedUsersCount;
        }

        if (this._filteredIssuesResolve) {
            if (issues && issues.length > 0) {
                SearchJiraHelper.setIssues(issues, AssignedWorkItemsViewProviderId);
                this._filteredIssuesResolve(this.buildTreeItemsFromIssues(issues));
            } else {
                this._filteredIssuesResolve([]);
            }
            this._filteredIssuesResolve = null;
        }

        this._onDidChangeTreeData.fire();
    }

    public override dispose(): void {
        this._disposable.dispose();
    }

    private refreshWithoutNotifications(): void {
        this._skipNotificationForNextFetch = true;
        this.refresh();
    }

    private refresh(delay?: number): Promise<void> {
        return new Promise<void>((resolve) =>
            setTimeout(() => {
                this._onDidChangeTreeData.fire();
                resolve();
            }, delay || 1),
        );
    }

    public getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    public async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        // Show viewsWelcome with login button if user is not authenticated
        if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return [];
        }

        if (element instanceof AssigneeGroupNode) {
            return element.getChildren();
        }

        if (element) {
            return [];
        } else if (this._filteredIssues !== null) {
            if (this._filteredIssues.length === 0) {
                return new Promise<TreeItem[]>((resolve) => {
                    const existingResolve = this._filteredIssuesResolve;
                    this._filteredIssuesResolve = (items) => {
                        if (existingResolve) {
                            existingResolve(items);
                        }
                        resolve(items);
                    };
                });
            }
            SearchJiraHelper.setIssues(this._filteredIssues, AssignedWorkItemsViewProviderId);
            return this.buildTreeItemsFromIssues(this._filteredIssues);
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
                this._jiraNotifier.ignoreAssignedIssues(issues);

                this._initChildren.push(...this.buildTreeItemsFromIssues(issues));
                break;
            }

            if (!this._initPromises.isEmpty()) {
                // need to trigger a DidChangeTreeData after this method ends - 10ms as a small-enough timeout
                setTimeout(() => this._onDidChangeTreeData.fire(), 10);
            }

            return this._initChildren;
        } else {
            if (this._filteredIssues !== null) {
                this._filteredIssues = null;
            }

            timer.mark(RefreshCumulativeJqlFetchEventName);
            const jqlEntries = Container.jqlManager.getAllDefaultJQLEntries();
            if (!jqlEntries.length) {
                return [AssignedWorkItemsViewProvider._treeItemConfigureJiraMessage];
            }
            const allIssues = (await Promise.all(jqlEntries.map(executeJqlQuery))).flat();

            if (this._skipNotificationForNextFetch) {
                this._skipNotificationForNextFetch = false;
                this._jiraNotifier.ignoreAssignedIssues(allIssues);
            } else {
                this._jiraNotifier.notifyForNewAssignedIssues(allIssues);
            }

            SearchJiraHelper.setIssues(allIssues, AssignedWorkItemsViewProviderId);
            const jqlRefreshDuration = timer.measureAndClear(RefreshCumulativeJqlFetchEventName);
            performanceEvent(RefreshCumulativeJqlFetchEventName, jqlRefreshDuration).then((event) => {
                Container.analyticsClient.sendTrackEvent(event);
            });

            return this.buildTreeItemsFromIssues(allIssues);
        }
    }

    private buildTreeItemsFromIssues(issues?: TreeViewIssue[]): TreeItem[] {
        if (!issues || issues.length === 0) {
            return [];
        }

        return this._selectedUsersCount > 1
            ? this.buildGroupedTreeItems(issues)
            : issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.JiraAssignedIssuesNode, issue));
    }

    private buildGroupedTreeItems(issues: TreeViewIssue[]): TreeItem[] {
        const issuesByAssignee = new Map<string, TreeViewIssue[]>();

        for (const issue of issues) {
            const assignee = (issue as any).assignee;
            const assigneeKey = assignee?.accountId || 'unassigned';

            if (!issuesByAssignee.has(assigneeKey)) {
                issuesByAssignee.set(assigneeKey, []);
            }
            issuesByAssignee.get(assigneeKey)!.push(issue);
        }

        const groupNodes: TreeItem[] = [];
        for (const [, assigneeIssues] of issuesByAssignee.entries()) {
            const assignee = assigneeIssues[0] ? (assigneeIssues[0] as any).assignee : null;
            const assigneeName = assignee?.displayName || assignee?.name || 'No assignee';

            const groupNode = new AssigneeGroupNode(assigneeName, assigneeIssues.length, assigneeIssues);
            groupNodes.push(groupNode);
        }

        groupNodes.sort((a, b) => {
            const aLabel = a.label?.toString() || '';
            const bLabel = b.label?.toString() || '';
            if (aLabel === 'No assignee') {
                return 1;
            }
            if (bLabel === 'No assignee') {
                return -1;
            }
            return aLabel.localeCompare(bLabel);
        });

        return groupNodes;
    }

    public async handleDrag(source: readonly TreeItem[], treeDataTransfer: DataTransfer, _token: CancellationToken) {
        treeDataTransfer.set(
            'application/vnd.code.tree.jiraAssignedWorkItem',
            new DataTransferItem(source.map((x) => x.resourceUri)),
        );
    }
}
