import { CompletionItem, CompletionItemKind, CompletionItemProvider, Position, TextDocument, window } from 'vscode';

import { PRFileDiffQueryParams } from '../views/pullrequest/diffViewHelper';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';
import { clientForSite } from './bbUtils';

export class BitbucketMentionsCompletionProvider implements CompletionItemProvider {
    async provideCompletionItems(doc: TextDocument, pos: Position) {
        const activePullRequestUri = window.visibleTextEditors
            .map((textEditor) => textEditor.document.uri)
            .find((uri) => uri.scheme === PullRequestNodeDataProvider.SCHEME);

        if (!activePullRequestUri) {
            return;
        }
        const wordRange = doc.getWordRangeAtPosition(pos, /@\S*/);
        if (!wordRange || wordRange.isEmpty) {
            return;
        }
        const triggerWord = doc.getText(wordRange);

        const { site, participants } = JSON.parse(activePullRequestUri.query) as PRFileDiffQueryParams;
        const bbApi = await clientForSite(site);
        const users = await bbApi.pullrequests.getReviewers(site, triggerWord.slice(1));

        users.push(
            ...participants.filter((participant) => !users.some((user) => user.accountId === participant.accountId)),
        );

        return users.map((user) => {
            const item = new CompletionItem(user.displayName, CompletionItemKind.Constant);
            item.detail = user.mention;
            // Remove `@` as it is included in user input already
            item.insertText = user.mention.slice(1);
            item.filterText = `${triggerWord.slice(1)} ${user.displayName}`;
            return item;
        });
    }
}
