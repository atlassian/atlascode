import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { ProductJira } from '../../../atlclients/authInfo';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { JQLEntry } from '../../../config/model';
import { Container } from '../../../container';
import { CommandContext, setCommandContext } from '../../../commandContext';
import { Commands } from '../../../commands';
import { configuration } from '../../../config/configuration';
import { fetchMinimalIssue } from '../../../jira/fetchIssue';
import {
    Disposable,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    ConfigurationChangeEvent,
    EventEmitter,
    commands,
    window,
} from 'vscode';
import { JiraIssueNode, executeJqlQuery, createLabelItem } from './utils';
import { SearchJiraHelper } from '../searchJiraHelper';

const enum ViewStrings {
    LoginToJiraMessage = 'Please login to Jira',
    ConfigureJqlMessage = 'Configure JQL entries in settings to view Jira issues',
    NoIssuesMessage = 'No issues match this query',
}

const CustomJQLViewProviderId = 'atlascode.views.jira.customJqlTreeView';

export class CustomJQLViewProvider implements TreeDataProvider<TreeItem>, Disposable {
    private static readonly _treeItemLoginToJiraMessage = createLabelItem(ViewStrings.LoginToJiraMessage, {
        command: Commands.ShowConfigPage,
        title: 'Login to Jira',
        arguments: [ProductJira],
    });
    private static readonly _treeItemConfigureJqlMessage = createLabelItem(ViewStrings.ConfigureJqlMessage, {
        command: Commands.ShowJiraIssueSettings,
        title: 'Configure Filters',
        arguments: ['ConfigureJQLNode'],
    });

    private _disposable: Disposable;

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {
        this._disposable = Disposable.from(
            Container.jqlManager.onDidJQLChange(this.refresh, this),
            Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
            commands.registerCommand(Commands.RefreshCustomJqlExplorer, this.refresh, this),
        );

        window.createTreeView(CustomJQLViewProviderId, { treeDataProvider: this });

        setCommandContext(CommandContext.CustomJQLExplorer, true);

        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));

        this.refresh();
    }

    onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'jira.jqlList') || configuration.changed(e, 'jira.explorer')) {
            this.refresh();
        }
    }

    dispose() {
        this._disposable.dispose();
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (element instanceof JiraIssueQueryNode || element instanceof JiraIssueNode) {
            return await element.getChildren();
        } else if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return [CustomJQLViewProvider._treeItemLoginToJiraMessage];
        } else {
            SearchJiraHelper.clearIssues(CustomJQLViewProviderId);

            const jqlEntries = Container.jqlManager.getCustomJQLEntries();
            return jqlEntries.length
                ? jqlEntries.map((jqlEntry) => new JiraIssueQueryNode(jqlEntry))
                : [CustomJQLViewProvider._treeItemConfigureJqlMessage];
        }
    }

    private refresh() {
        this._onDidChangeTreeData.fire();
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

            issues = Container.config.jira.explorer.nestSubtasks ? await this.constructIssueTree(issues) : issues;
            SearchJiraHelper.appendIssues(issues, CustomJQLViewProviderId);

            return issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.CustomJqlQueriesNode, issue));
        })();
    }

    public getChildren(): Promise<TreeItem[]> {
        return this.children;
    }

    private async constructIssueTree(
        jqlIssues: MinimalIssue<DetailedSiteInfo>[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const parentIssues = await this.fetchMissingAncestorIssues(jqlIssues);
        const jqlAndParents = [...jqlIssues, ...parentIssues];

        const rootIssues: MinimalIssue<DetailedSiteInfo>[] = [];
        jqlAndParents.forEach((i) => {
            const parentKey = i.parentKey ?? i.epicLink;
            if (parentKey) {
                const parent = jqlAndParents.find((i2) => parentKey === i2.key);
                if (parent) {
                    parent.subtasks.push(i);
                }
            } else {
                rootIssues.push(i);
            }
        });

        return [...rootIssues];
    }

    // Fetch any parents and grandparents that might be missing from the set to ensure that the a path can be drawn all
    // the way from a subtask to an epic.
    private async fetchMissingAncestorIssues(
        newIssues: MinimalIssue<DetailedSiteInfo>[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
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

    private calculateMissingParentKeys(issues: MinimalIssue<DetailedSiteInfo>[]): string[] {
        // On NextGen projects epics are considered parents to issues and parentKey points to them. On classic projects
        // issues parentKey doesn't point to its epic, but its epicLink does. In both cases parentKey points to the
        // parent task for subtasks. Since they're disjoint we can just take both and treat them the same.
        const parentKeys = issues.map((i) => i.parentKey).filter((x): x is string => !!x);
        const epicKeys = issues.map((i) => i.epicLink).filter((x) => !!x);
        const uniqueParentKeys = Array.from(new Set([...parentKeys, ...epicKeys]));
        return uniqueParentKeys.filter((k) => !issues.some((i) => i.key === k));
    }

    private async fetchIssuesForKeys(
        site: DetailedSiteInfo,
        keys: string[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        return await Promise.all(
            keys.map(async (issueKey) => {
                const parent = await fetchMinimalIssue(issueKey, site);
                // we only need the parent information here, we already have all the subtasks that satisfy the jql query
                parent.subtasks = [];
                return parent;
            }),
        );
    }
}
