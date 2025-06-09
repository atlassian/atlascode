import {
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    SnippetString,
    TextDocument,
} from 'vscode';

import { getAgent, getAxiosInstance } from '../../jira/jira-client/providers';
import { Logger } from '../../logger';

const BB_PIPES_URL =
    'https://api.bitbucket.org/2.0/repositories/bitbucketpipelines/official-pipes/src/master/pipes.prod.json';

interface NamedWebsite {
    name: string;
    website: string;
}

interface PipeMeta {
    name: string;
    description: string;
    repositoryPath: string;
    version: string;
    vendor: NamedWebsite;
    maintainer: NamedWebsite;
    yml: string;
    logo: string;
}

export class PipelinesYamlCompletionProvider implements CompletionItemProvider {
    private knownPipes: PipeMeta[] = [];
    private pipeItems: CompletionItem[] = [];
    private pipeItemsNoPipe: CompletionItem[] = [];

    public constructor() {
        this.loadPipes();
    }

    public provideCompletionItems(doc: TextDocument, pos: Position) {
        if (this.pipeItems.length < 1 || !this.showPipes(doc, pos)) {
            return undefined;
        }

        if (this.getFirstWord(doc, pos) === 'pipe') {
            return this.pipeItemsNoPipe;
        }

        return this.pipeItems;
    }

    private showPipes(doc: TextDocument, pos: Position): boolean {
        const wordOnLine = this.getFirstWord(doc, pos);

        if (
            wordOnLine === 'pipe' ||
            (wordOnLine === undefined && this.findParentWord(doc, pos.with(pos.line - 1, 0)) === 'script')
        ) {
            return true;
        }

        return false;
    }

    private findParentWord(doc: TextDocument, pos: Position): string | undefined {
        const line = doc.lineAt(pos.line);

        if (pos.line < 1) {
            return undefined;
        }

        if (line.isEmptyOrWhitespace) {
            return this.findParentWord(doc, pos.with(pos.line - 1, 0));
        }

        const wordRange = doc.getWordRangeAtPosition(pos.with(pos.line, line.firstNonWhitespaceCharacterIndex));
        const text = doc.getText(wordRange);

        if (text === '-' || text.startsWith('#')) {
            return this.findParentWord(doc, pos.with(pos.line - 1, 0));
        }

        return text;
    }

    private getFirstWord(doc: TextDocument, pos: Position): string | undefined {
        const line = doc.lineAt(pos.line);

        if (line.isEmptyOrWhitespace) {
            return undefined;
        }

        let wordRange = doc.getWordRangeAtPosition(pos.with(pos.line, line.firstNonWhitespaceCharacterIndex));
        let text = doc.getText(wordRange);

        if (text === '-') {
            wordRange = doc.getWordRangeAtPosition(pos.with(pos.line, line.firstNonWhitespaceCharacterIndex + 2));
            text = doc.getText(wordRange);
        }

        return text;
    }

    private loadPipes(): void {
        const transport = getAxiosInstance();

        transport(BB_PIPES_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...getAgent(),
        })
            .then((res) => res.data)
            .then((res: PipeMeta[]) => {
                if (res) {
                    this.knownPipes = res;

                    res.forEach((pipemeta) => {
                        const item = new CompletionItem(pipemeta.name, CompletionItemKind.Snippet);
                        item.insertText = new SnippetString(pipemeta.yml);
                        item.documentation = pipemeta.description;
                        this.pipeItems.push(item);

                        const itemNoPipe = new CompletionItem(pipemeta.name, CompletionItemKind.Snippet);
                        if (pipemeta.yml.startsWith('- pipe: ')) {
                            itemNoPipe.insertText = new SnippetString(pipemeta.yml.substring(8));
                        } else {
                            item.insertText = new SnippetString(pipemeta.yml);
                        }

                        itemNoPipe.documentation = pipemeta.description;
                        this.pipeItemsNoPipe.push(itemNoPipe);
                    });
                }
            })
            .catch((err) => {
                Logger.error(err, 'Error getting pipes');
                Logger.debug('knownpipes', this.knownPipes);
            });
    }
}
