import { DetailedSiteInfo, Product, ProductJira } from 'src/atlclients/authInfo';
import { JQLEntry } from 'src/config/model';
import { Container } from '../../../container';
import { AbstractBaseNode } from 'src/views/nodes/abstractBaseNode';
import { BaseTreeDataProvider } from 'src/views/Explorer';
import { CustomJQLTree } from '../customJqlTree';
import { ConfigureJQLNode } from '../configureJQLNode';
import { CONFIGURE_JQL_STRING, CUSTOM_JQL_VIEW_PROVIDER_ID } from './constants';
import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { Disposable, window } from 'vscode';
import { SearchJiraIssuesNode } from '../searchJiraIssueNode';

const searchJiraIssuesNode = new SearchJiraIssuesNode();

export class CustomJQLViewProvider extends BaseTreeDataProvider {
    private _disposable: Disposable;
    private _id: string = CUSTOM_JQL_VIEW_PROVIDER_ID;
    private _jqlEntries: JQLEntry[];
    private _children: CustomJQLTree[];

    constructor() {
        super();
        this._jqlEntries = Container.jqlManager.enabledJQLEntries();
        this._children = [];
        this._disposable = Disposable.from(
            Container.jqlManager.onDidJQLChange(this.refresh, this),
            Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
        );
        window.createTreeView(this.viewId(), { treeDataProvider: this });
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

    refresh() {
        this._children.forEach((child) => {
            child.dispose();
        });
        this._children = [];
        this._jqlEntries = Container.jqlManager.enabledJQLEntries();
    }

    getTreeItem(element: AbstractBaseNode) {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode | undefined) {
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
                        // Logger.error(new Error(`Error executing JQL: ${e}`));
                        return [];
                    });
                    childTree.setNumIssues(flattenedIssueList.length);
                    allIssues.push(...flattenedIssueList);
                    return childTree;
                }),
            );
            allIssues = [...new Map(allIssues.map((issue) => [issue.key, issue])).values()]; //dedupe
            searchJiraIssuesNode.setIssues(allIssues);
            return [...this._children];
        }

        return [];
    }
}
