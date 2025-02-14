import TurnDownService from 'turndown';
import * as vscode from 'vscode';
import { HoverProvider } from 'vscode';
import { viewScreenEvent } from '../../analytics';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { IssueKeyRegEx } from '../../jira/issueKeyParser';

export class IssueHoverProvider implements HoverProvider {
    async provideHover(doc: vscode.TextDocument, position: vscode.Position) {
        let range = doc.getWordRangeAtPosition(position, IssueKeyRegEx);
        if (range === undefined || range.isEmpty) {
            return null;
        }
        let text = doc.getText(range);
        return this.getIssueDetails(text);
    }

    private async getIssueDetails(key: string): Promise<vscode.Hover> {
        let issue = undefined;
        try {
            issue = await issueForKey(key);
        } catch {
            return Promise.reject(`issue not found ${key}`);
        }

        const summaryText = issue.summary ? issue.summary : '';
        const statusText = issue.status.name;

        //Use the TurnDown library to convert Jira's html to standard markdown
        const turnDownService = new TurnDownService();
        const descriptionText = issue.descriptionHtml
            ? turnDownService.turndown(issue.descriptionHtml)
            : '*No description*';

        const header = `| ![](${issue.issuetype.iconUrl})                        | ${key}: ${summaryText} |
| -                                                      | -                      |
| ![](${issue.priority.iconUrl.replace('.svg', '.png')}) | ${issue.priority.name} |
|                                                        | ${statusText}          |`;

        let text = [];
        text.push(new vscode.MarkdownString(header));
        text.push(new vscode.MarkdownString(descriptionText));
        const encodedKey = encodeURIComponent(JSON.stringify([issue.siteDetails.id, key]));
        const showIssueCommandString = `(command:${Commands.ShowIssueForSiteIdAndKey}?${encodedKey} "View Issue")`;
        const issueUrlString = `(${issue.siteDetails.baseLinkUrl}/browse/${key})`;
        const issueLinksLine = `[Open Issue View]${showIssueCommandString} | [Open In Browser]${issueUrlString}`;
        text.push(new vscode.MarkdownString(issueLinksLine));
        text[text.length - 1].isTrusted = true;

        viewScreenEvent('issueHover', issue.siteDetails).then((e) => {
            Container.analyticsClient.sendScreenEvent(e);
        });

        return new vscode.Hover(text);
    }
}
