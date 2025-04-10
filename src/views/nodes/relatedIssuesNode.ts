import { TreeItem, TreeItemCollapsibleState } from 'vscode';

import { issueForKey } from '../../jira/issueForKey';
import { Resources } from '../../resources';
import { Promise_allSucceeded } from '../../util/promises';
import { JiraIssueNode, TreeViewIssue } from '../jira/treeViews/utils';
import { AbstractBaseNode } from './abstractBaseNode';
import { SimpleNode } from './simpleNode';

export class RelatedIssuesNode extends TreeItem implements AbstractBaseNode {
    private readonly childrenPromises: Promise<JiraIssueNode[]>;

    constructor(jiraKeys: string[], label: string) {
        const collapsibleState = jiraKeys.length ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None;
        super(label, collapsibleState);

        this.iconPath = Resources.icons.get('issues');

        this.childrenPromises = Promise_allSucceeded(
            jiraKeys.map((key) =>
                issueForKey(key).then((issue) => {
                    (issue as TreeViewIssue).children = [];
                    (issue as TreeViewIssue).jqlSource = {
                        id: 'relatedJiras',
                        name: '',
                        query: '',
                        siteId: '',
                        enabled: false,
                        monitor: false,
                    };
                    return new JiraIssueNode(
                        JiraIssueNode.NodeType.RelatedJiraIssueInBitbucketPR,
                        issue as TreeViewIssue,
                    );
                }),
            ),
        );
    }

    getTreeItem(): Promise<TreeItem> | TreeItem {
        return this;
    }

    async getChildren(): Promise<AbstractBaseNode[]> {
        const children = await this.childrenPromises;
        return children.length ? children : [new SimpleNode('No issues found')];
    }

    dispose(): void {}
}
