import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    TreeViewVisibilityChangeEvent,
    window,
} from 'vscode';

import { viewScreenEvent } from '../../../analytics';
import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { CommandContext, setCommandContext } from '../../../commandContext';
import { configuration } from '../../../config/configuration';
import { JQLEntry } from '../../../config/model';
import { Commands } from '../../../constants';
import { Container } from '../../../container';
import { fetchMinimalIssue } from '../../../jira/fetchIssue';
import { SitesAvailableUpdateEvent } from '../../../siteManager';
import { RefreshTimer } from '../../RefreshTimer';
import { SearchJiraHelper } from '../searchJiraHelper';
import { createLabelItem, executeJqlQuery, JiraIssueNode, loginToJiraMessageNode, TreeViewIssue } from './utils';

const enum ViewStrings {
    ConfigureJqlMessage = 'Configure JQL entries in settings to view Jira issues',
    NoIssuesMessage = 'No issues match this query',
}

const CustomJQLViewProviderId = 'atlascode.views.jira.customJqlTreeView';

export class CustomJQLViewProvider extends Disposable implements TreeDataProvider<TreeItem> {
    private static readonly _treeItemLoginToJiraMessage = loginToJiraMessageNode;
    private static readonly _treeItemConfigureJqlMessage = createLabelItem(ViewStrings.ConfigureJqlMessage, {
        command: Commands.ShowJiraIssueSettings,
        title: 'Configure Filters',
        arguments: ['ConfigureJQLNode'],
    });

    private _disposable: Disposable;

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {
        super(() => this.dispose());

        const treeView = window.createTreeView(CustomJQLViewProviderId, { treeDataProvider: this });

        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh()),
            commands.registerCommand(Commands.RefreshCustomJqlExplorer, this.refresh, this),
            treeView.onDidChangeVisibility((e) => this.onDidChangeVisibility(e)),
            treeView,
        );

        const jqlEntries = Container.jqlManager.enabledJQLEntries();
        if (jqlEntries.length) {
            setCommandContext(CommandContext.CustomJQLExplorer, Container.config.jira.explorer.enabled);
        }

        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
        this._onDidChangeTreeData.fire();
    }

    private async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent): Promise<void> {
        if (event.visible && Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            viewScreenEvent(CustomJQLViewProviderId, undefined, ProductJira).then((e) => {
                Container.analyticsClient.sendScreenEvent(e);
            });
        }
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (
            configuration.changed(e, 'jira.jqlList') ||
            configuration.changed(e, 'jira.explorer') ||
            configuration.changed(e, 'jira.explorer.enabled')
        ) {
            const jqlEntries = Container.jqlManager.enabledJQLEntries();
            if (jqlEntries.length) {
                setCommandContext(CommandContext.CustomJQLExplorer, Container.config.jira.explorer.enabled);
            } else {
                setCommandContext(CommandContext.CustomJQLExplorer, false);
            }
            this.refresh();
        }
    }

    private async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductJira.key) {
            this.refresh();
        }
    }

    public override dispose() {
        this._disposable.dispose();
    }

    private refresh(delay?: number): Promise<void> {
        return new Promise<void>((resolve) =>
            setTimeout(() => {
                SearchJiraHelper.clearIssues(CustomJQLViewProviderId);
                this._onDidChangeTreeData.fire();
                resolve();
            }, delay || 1),
        );
    }

    public getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    public async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (element instanceof JiraIssueQueryNode || element instanceof JiraIssueNode) {
            return await element.getChildren();
        } else if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return [CustomJQLViewProvider._treeItemLoginToJiraMessage];
        } else {
            SearchJiraHelper.clearIssues(CustomJQLViewProviderId);

            const jqlEntries = Container.jqlManager.enabledJQLEntries();
            return jqlEntries.length
                ? jqlEntries.map((jqlEntry) => new JiraIssueQueryNode(jqlEntry))
                : [CustomJQLViewProvider._treeItemConfigureJqlMessage];
        }
    }
}

class JiraIssueQueryNode extends TreeItem {
    private static readonly _treeItemNoIssuesMessage = createLabelItem(ViewStrings.NoIssuesMessage);

    private readonly children: Promise<TreeItem[]>;

    constructor(private jqlEntry: JQLEntry) {
        super(jqlEntry.name, TreeItemCollapsibleState.Collapsed);
        this.id = jqlEntry.id;

        this.children = (async () => {
            let issues = await executeJqlQuery(this.jqlEntry);
            if (!issues || !issues.length) {
                return [JiraIssueQueryNode._treeItemNoIssuesMessage];
            }

            // index only issues that are directly retrieved with the JQL queries, and not
            // the extra parent items retrieved to rebuild the issues hierarchy
            SearchJiraHelper.appendIssues(issues, CustomJQLViewProviderId);

            issues = Container.config.jira.explorer.nestSubtasks ? await this.constructIssueTree(issues) : issues;

            return issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, issue));
        })();
    }

    public getChildren(): Promise<TreeItem[]> {
        return this.children;
    }

    private async constructIssueTree(jqlIssues: TreeViewIssue[]): Promise<TreeViewIssue[]> {
        const parentIssues = await this.fetchMissingAncestorIssues(jqlIssues);
        const jqlAndParents = [...jqlIssues, ...parentIssues];

        const rootIssues: TreeViewIssue[] = [];
        jqlAndParents.forEach((i) => {
            const parentKey = i.parentKey ?? i.epicLink;
            if (parentKey) {
                const parent = jqlAndParents.find((i2) => parentKey === i2.key);
                if (parent) {
                    parent.children.push(i);
                }
            } else {
                rootIssues.push(i);
            }
        });

        return [...rootIssues];
    }

    // Fetch any parents and grandparents that might be missing from the set to ensure that the a path can be drawn all
    // the way from a subtask to an epic.
    private async fetchMissingAncestorIssues(newIssues: TreeViewIssue[]): Promise<TreeViewIssue[]> {
        if (!newIssues.length) {
            return [];
        }
        const site = newIssues[0].siteDetails;

        const missingParentKeys = this.calculateMissingParentKeys(newIssues);
        const parentIssues = await this.fetchIssuesForKeys(site, missingParentKeys);

        // If a jqlIssue is a sub-task we make a second call to make sure we get its parent's epic.
        const missingGrandparentKeys = this.calculateMissingParentKeys([...newIssues, ...parentIssues]);
        const grandparentIssues = await this.fetchIssuesForKeys(site, missingGrandparentKeys);

        return [...parentIssues, ...grandparentIssues];
    }

    private calculateMissingParentKeys(issues: TreeViewIssue[]): string[] {
        // On NextGen projects epics are considered parents to issues and parentKey points to them. On classic projects
        // issues parentKey doesn't point to its epic, but its epicLink does. In both cases parentKey points to the
        // parent task for subtasks. Since they're disjoint we can just take both and treat them the same.
        const parentKeys = issues.map((i) => i.parentKey).filter((x): x is string => !!x);
        const epicKeys = issues.map((i) => i.epicLink).filter((x) => !!x);
        const uniqueParentKeys = Array.from(new Set([...parentKeys, ...epicKeys]));
        return uniqueParentKeys.filter((k) => !issues.some((i) => i.key === k));
    }

    private async fetchIssuesForKeys(site: DetailedSiteInfo, keys: string[]): Promise<TreeViewIssue[]> {
        return await Promise.all(
            keys.map(async (issueKey) => {
                const parent = (await fetchMinimalIssue(issueKey, site)) as TreeViewIssue;
                parent.source = this.jqlEntry;
                parent.children = [];
                return parent;
            }),
        );
    }
}
