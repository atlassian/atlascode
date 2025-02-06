import { CodeLens, Range, Position, TextDocument, CancellationToken, l10n } from 'vscode';
import { parseJiraIssueKeys } from './issueKeyParser';
import { Container } from '../container';
import { Commands } from '../commands';

interface LensMatch {
    document: TextDocument;
    text: string;
    range: Range;
}

export function provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] {
    if (!Container.config.jira.todoIssues.enabled || !Container.config.jira.enabled) {
        return [];
    }

    const matches = findTodos(document);
    return matches.map((match) => {
        const insertionPoint = new Position(match.range.end.line, match.range.end.character + 1);
        return new CodeLens(match.range, {
            title: l10n.t('Create Jira Issue'),
            command: Commands.CreateIssue,
            arguments: [{ fromCodeLens: true, summary: match.text, uri: document.uri, insertionPoint: insertionPoint }],
        });
    });
}

function findTodos(document: TextDocument) {
    const triggers = Container.config.jira.todoIssues.triggers;
    const matches: LensMatch[] = [];

    //Cut off execution immediately if there are no triggers
    if (triggers.length === 0) {
        return matches;
    }

    /*
        This builds a regex which will find words that:
        1. Contain the Trigger
        2. Are not preceeded by an alphanumeric character

        Regex string will have form: (^|\W)((trigger1)|(trigger2)|...|(triggerN))
    */
    let regexTrigger: string = triggers.map((t) => `(${t.replace(/(\W)/g, '\\$1')})`).join('|'); //Creates string of form (trigger1)|(trigger2)|...|(triggerN)
    let regexString: string = `(^|\\W)(${regexTrigger})`;
    const masterRegex = new RegExp(regexString);

    //Search through the document line by line
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;

        //Find a match in the line given the regex
        const reMatches = masterRegex.exec(line);
        if (reMatches) {
            const issueKeys = parseJiraIssueKeys(line);
            if (issueKeys.length === 0) {
                const index = reMatches.index;
                const word = reMatches[0];
                const range = new Range(new Position(i, index), new Position(i, index + word.length - 1));
                const ersatzSummary = line.substr(index + word.length).trim();
                matches.push({ document: document, text: ersatzSummary, range: range });
            }
        }
    }
    return matches;
}
