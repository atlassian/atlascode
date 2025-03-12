import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { Container } from '../../../container';
import { Commands } from '../../../commands';
import { SearchJiraHelper } from '../searchJiraHelper';
import { PromiseRacer } from '../../../util/promises';
import { Disposable, TreeDataProvider, TreeItem, EventEmitter, commands, window } from 'vscode';
import { JiraIssueNode, executeJqlQuery, createLabelItem } from './utils';

const enum ViewStrings {
    ConfigureJiraMessage = 'Please login to Jira',
}

export class AssignedWorkItemsViewProvider implements TreeDataProvider<TreeItem>, Disposable {
    private static readonly _treeItemConfigureJiraMessage = createLabelItem(ViewStrings.ConfigureJiraMessage, {
        command: Commands.ShowConfigPage,
        title: 'Login to Jira',
        arguments: [ProductJira],
    });
    private static readonly _id = 'atlascode.views.jira.assignedWorkItemsTreeView';

    private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _disposable: Disposable;
    private _initPromises: PromiseRacer<MinimalIssue<DetailedSiteInfo>[]> | undefined;
    private _initChildren: TreeItem[] = [];

    constructor() {
        this._disposable = Disposable.from(
            Container.jqlManager.onDidJQLChange(this.refresh, this),
            Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
            commands.registerCommand(Commands.RefreshAssignedWorkItemsExplorer, this.refresh, this),
        );

        window.createTreeView(AssignedWorkItemsViewProvider._id, { treeDataProvider: this });

        const jqlEntries = Container.jqlManager.getAllDefaultJQLEntries();
        if (jqlEntries.length) {
            this._initPromises = new PromiseRacer(jqlEntries.map(executeJqlQuery));
        }

        this._onDidChangeTreeData.fire();
    }

    dispose() {
        this._disposable.dispose();
    }

    private refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
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

                SearchJiraHelper.appendIssues(issues, AssignedWorkItemsViewProvider._id);
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
            SearchJiraHelper.setIssues(allIssues, AssignedWorkItemsViewProvider._id);
            return this.buildTreeItemsFromIssues(allIssues);
        }
    }

    private buildTreeItemsFromIssues(issues?: MinimalIssue<DetailedSiteInfo>[]): TreeItem[] {
        return issues
            ? issues.map((issue) => new JiraIssueNode(JiraIssueNode.NodeType.JiraAssignedIssuesNode, issue))
            : [];
    }
}
