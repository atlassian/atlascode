import { Commands } from '../constants';
import { KnownLinkID } from '../lib/ipc/models/common';
import { iconSet } from '../resources';
import { BaseTreeDataProvider } from './Explorer';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { InternalLinkNode } from './nodes/internalLinkNode';
import { IssueNode } from './nodes/issueNode';
import { LinkNode } from './nodes/linkNode';

export class HelpDataProvider extends BaseTreeDataProvider {
    constructor() {
        super();
    }

    override getTreeItem(element: AbstractBaseNode) {
        return element.getTreeItem();
    }

    async getChildren(element: IssueNode | undefined) {
        return [
            new LinkNode(
                'Get Started',
                'Check out our quick-start guide',
                iconSet.ATLASSIANICON,
                KnownLinkID.GettingStarted,
            ),
            new LinkNode('What is JQL?', 'Learn about Jira Query Language', iconSet.JIRAICON, KnownLinkID.WhatIsJQL),
            new LinkNode(
                'Contribute',
                'Create pull requests for this extension',
                iconSet.PULLREQUEST,
                KnownLinkID.Contribute,
            ),
            new LinkNode('Report an Issue', 'Report and vote on issues', iconSet.ISSUES, KnownLinkID.ReportAnIssue),
            new InternalLinkNode(
                'Explore Features',
                'Overwhelmed? Check out some of the most common features, all in one place',
                iconSet.SEARCH,
                {
                    command: Commands.ShowExploreSettings,
                    title: 'Open Explore Page',
                },
            ),
        ];
    }
}
