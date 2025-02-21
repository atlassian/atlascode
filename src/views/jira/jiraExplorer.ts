import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { commands, Disposable } from 'vscode';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { FocusEvent, FocusEventActions } from '../../webview/ExplorerFocusManager';
import { BaseTreeDataProvider, Explorer } from '../Explorer';
import { IssueNode } from '../nodes/issueNode';
import { CustomJQLRoot } from './customJqlRoot';
import { CustomJQLTree } from './customJqlTree';
import { CreateJiraIssueNode } from './headerNode';

export interface Refreshable {
    refresh(): void;
}
export class JiraExplorer extends Explorer implements Refreshable {
    private _disposables: Disposable[] = [];

    constructor(
        private _id: string,
        dataProvider: CustomJQLRoot,
    ) {
        super(() => this.dispose());
        this.treeDataProvider = dataProvider;
        this.newTreeView();
    }

    viewId() {
        return this._id;
    }

    product() {
        return ProductJira;
    }

    refresh() {
        if (this.treeDataProvider) {
            this.treeDataProvider.refresh();
        }
    }

    dispose() {
        super.dispose();
        this._disposables.forEach((d) => d.dispose());
    }

    public async findIssue(
        issueKey: string,
        jqlRoot?: BaseTreeDataProvider,
    ): Promise<MinimalORIssueLink<DetailedSiteInfo> | undefined> {
        let dp = jqlRoot;
        if (dp === undefined) {
            dp = this.treeDataProvider as CustomJQLRoot;
        }

        let issue: MinimalORIssueLink<DetailedSiteInfo> | undefined = undefined;
        if (this.treeDataProvider) {
            let dpchildren = [];

            if (dp instanceof CustomJQLTree) {
                dpchildren = await dp.getChildren(undefined, false);
            } else {
                dpchildren = await dp.getChildren(undefined);
            }

            for (const child of dpchildren) {
                if (child instanceof IssueNode) {
                    if (child.issue.key === issueKey) {
                        issue = child.issue;
                        break;
                    }
                    issue = await this.findIssueInChildren(issueKey, child);
                    if (issue !== undefined) {
                        break;
                    }
                } else if (child instanceof CustomJQLTree) {
                    issue = await this.findIssue(issueKey, child);
                    if (issue !== undefined) {
                        break;
                    }
                }
            }
        }

        return issue;
    }

    async focusEvent(e: FocusEvent) {
        const dataProvider = this.getDataProvider();
        if (dataProvider instanceof CustomJQLRoot) {
            if (e.action === FocusEventActions.VIEWISSUE) {
                const firstJQLResult = await dataProvider.getFirstJQLResult();

                //If the JQL query returns nothing, firstJQLResult will be a SimpleJirIssueNode saying "No issue match this query"
                //In that case, the node gets focused, but nothing else happens.
                //This is an acceptable behavior because there is only one default JQL configured, so checking for others doesn't make sense
                if (firstJQLResult instanceof IssueNode) {
                    this.reveal(firstJQLResult, { focus: true });
                    const commandObj = firstJQLResult.getTreeItem().command;
                    if (commandObj) {
                        commands.executeCommand(commandObj.command, ...(commandObj.arguments ?? []));
                    }
                }
            } else if (e.action === FocusEventActions.CREATEISSUE) {
                const createIssueNode = await dataProvider.getCreateIssueNode();
                if (createIssueNode instanceof CreateJiraIssueNode) {
                    this.reveal(createIssueNode, { focus: true });
                    commands.executeCommand(Commands.CreateIssue, undefined, 'HintNotification');
                }
            }
        }
    }

    async findIssueInChildren(
        issueKey: string,
        parent: IssueNode,
    ): Promise<MinimalORIssueLink<DetailedSiteInfo> | undefined> {
        let issue: MinimalORIssueLink<DetailedSiteInfo> | undefined = undefined;
        const children = await parent.getChildren();

        for (const child of children) {
            if (child.issue.key === issueKey) {
                issue = child.issue;
                break;
            }

            issue = await this.findIssueInChildren(issueKey, child);
            if (issue !== undefined) {
                break;
            }
        }

        return issue;
    }
}
