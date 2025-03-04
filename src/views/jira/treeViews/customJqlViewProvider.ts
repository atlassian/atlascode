import { DetailedSiteInfo, Product, ProductJira } from '../../../atlclients/authInfo';
import { JQLEntry } from '../../../config/model';
import { Container } from '../../../container';
import { AbstractBaseNode } from '../../nodes/abstractBaseNode';
import { BaseTreeDataProvider } from '../../Explorer';
import { CustomJQLTree } from '../customJqlTree';
import { ConfigureJQLNode } from '../configureJQLNode';
import { CONFIGURE_JQL_STRING, CUSTOM_JQL_VIEW_PROVIDER_ID } from './constants';
import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { commands, Disposable, EventEmitter, Event, window, ConfigurationChangeEvent } from 'vscode';
import { Logger } from '../../../logger';
import { CommandContext, setCommandContext } from '../../../commandContext';
import { Commands } from '../../../commands';
import { NewIssueMonitor } from '../../../jira/newIssueMonitor';
import { SearchJiraHelper } from '../searchJiraHelper';
import { configuration } from '../../../config/configuration';
import { SimpleJiraIssueNode } from '../../../views/nodes/simpleJiraIssueNode';
export class CustomJQLViewProvider extends BaseTreeDataProvider {
    private _disposable: Disposable;
    private _id: string = CUSTOM_JQL_VIEW_PROVIDER_ID;
    private _jqlEntries: JQLEntry[];
    private _children: CustomJQLTree[];
    private _newIssueMonitor: NewIssueMonitor;
    private _onDidChangeTreeData = new EventEmitter<AbstractBaseNode | null>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode | null> {
        return this._onDidChangeTreeData.event;
    }

    constructor() {
        super();

        this._jqlEntries = Container.jqlManager.enabledJQLEntries();
        this._newIssueMonitor = new NewIssueMonitor();
        this._children = [];
        this._disposable = Disposable.from(
            Container.jqlManager.onDidJQLChange(this.refresh, this),
            Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
            commands.registerCommand(Commands.RefreshCustomJqlExplorer, this.refresh, this),
        );
        window.createTreeView(this.viewId(), { treeDataProvider: this });
        setCommandContext(CommandContext.CustomJQLExplorer, true);

        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
    }

    onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'jira.jqlList') || configuration.changed(e, 'jira.explorer')) {
            this.refresh();
        }
    }

    viewId(): string {
        return this._id;
    }

    product(): Product {
        return ProductJira;
    }

    dispose() {
        this._children.forEach((child) => {
            child.dispose();
        });
        this._disposable.dispose();
    }

    async refresh() {
        await Container.jqlManager.updateFilters();
        this._children.forEach((child) => {
            child.dispose();
        });
        this._children = [];
        this._jqlEntries = Container.jqlManager.enabledJQLEntries();

        this._onDidChangeTreeData.fire(null);
        SearchJiraHelper.clearIssues(this.viewId()); // so no duplicates
        await this._newIssueMonitor.checkForNewIssues();
    }

    getTreeItem(element: AbstractBaseNode) {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode | undefined) {
        if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return Promise.resolve([
                new SimpleJiraIssueNode(
                    'Please login to Jira',
                    {
                        command: Commands.ShowConfigPage,
                        title: 'Login to Jira',
                        arguments: [ProductJira],
                    },
                    undefined,
                ),
            ]);
        }
        let allIssues: MinimalORIssueLink<DetailedSiteInfo>[] = [];
        if (element) {
            return element.getChildren();
        }

        if (this._jqlEntries.length === 0) {
            return [new ConfigureJQLNode(CONFIGURE_JQL_STRING)];
        }

        if (this._children.length === 0) {
            this._children = await Promise.all(
                this._jqlEntries.map(async (jql: JQLEntry) => {
                    const childTree = new CustomJQLTree(jql);
                    const flattenedIssueList = await childTree.executeQuery().catch((e) => {
                        Logger.error(new Error(`Error executing JQL: ${e}`));
                        return [];
                    });
                    childTree.setNumIssues(flattenedIssueList.length);
                    allIssues.push(...flattenedIssueList);
                    return childTree;
                }),
            );
            allIssues = [...new Map(allIssues.map((issue) => [issue.key, issue])).values()];
            SearchJiraHelper.setIssues(allIssues, this.viewId());
        }

        return [...this._children];
    }
}
