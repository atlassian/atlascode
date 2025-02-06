import { Commands } from '../commands';
import { KnownLinkID } from '../lib/ipc/models/common';
import { iconSet } from '../resources';
import { BaseTreeDataProvider } from './Explorer';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { InternalLinkNode } from './nodes/internalLinkNode';
import { IssueNode } from './nodes/issueNode';
import { LinkNode } from './nodes/linkNode';
import { l10n } from 'vscode';

export class HelpDataProvider extends BaseTreeDataProvider {
    constructor() {
        super();
    }

    getTreeItem(element: AbstractBaseNode) {
        return element.getTreeItem();
    }

    async getChildren(element: IssueNode | undefined) {
        return [
            new LinkNode(
                l10n.t('Get Started'),
                l10n.t('Check out our quick-start guide'),
                iconSet.ATLASSIANICON,
                KnownLinkID.GettingStarted,
            ),
            new LinkNode(
                l10n.t('What is JQL?'),
                l10n.t('Learn about Jira Query Language'),
                iconSet.JIRAICON,
                KnownLinkID.WhatIsJQL,
            ),
            new LinkNode(
                l10n.t('Contribute'),
                l10n.t('Create pull requests for this extension'),
                iconSet.PULLREQUEST,
                KnownLinkID.Contribute,
            ),
            new LinkNode(
                l10n.t('Report an Issue'),
                l10n.t('Report and vote on issues'),
                iconSet.ISSUES,
                KnownLinkID.ReportAnIssue,
            ),
            new LinkNode(
                l10n.t('Tweet about us'),
                l10n.t('Share your love for this extension'),
                iconSet.TWITTERLOGOBLUE,
                KnownLinkID.TweetAboutUs,
            ),
            new InternalLinkNode(
                l10n.t('Explore Features'),
                l10n.t('Overwhelmed? Check out some of the most common features, all in one place'),
                iconSet.SEARCH,
                {
                    command: Commands.ShowExploreSettings,
                    title: l10n.t('Open Explore Page'),
                },
            ),
        ];
    }
}
