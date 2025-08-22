import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const createMonacoPromptEditor = (container: HTMLElement) => {
    return monaco.editor.create(container, {
        value: '',
        language: 'plaintext',

        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        renderLineHighlight: 'none',
        scrollBeyondLastLine: false,
        wordWrap: 'on',

        overviewRulerLanes: 0,

        scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            verticalScrollbarSize: 8,
            alwaysConsumeMouseWheel: false,
        },

        automaticLayout: true,
        domReadOnly: false,
        readOnly: false,

        quickSuggestions: false,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'off',
        wordBasedSuggestions: 'off',

        accessibilitySupport: 'auto',

        cursorBlinking: 'blink',
        cursorStyle: 'line',
        selectOnLineNumbers: false,

        codeLens: false,
        contextmenu: false,
        find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'never',
        },

        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'var(--vscode-font-family)',
    });
};

interface SlashCommand {
    label: string;
    insertText: string;
    description?: string;
    command?: monaco.languages.Command;
}

export const SLASH_COMMANDS: SlashCommand[] = [
    {
        label: '/clear',
        insertText: '/clear',
        description: 'Clear the chat',
        command: { title: 'Clear', id: 'rovo-dev.clearChat', tooltip: 'Clear the chat' },
    },
    {
        label: '/prune',
        insertText: '/prune',
        description: 'Prune the chat',
        command: { title: 'Prune', id: 'rovo-dev.pruneChat', tooltip: 'Prune the chat' },
    },
    {
        label: '/memory',
        insertText: '/memory',
        description: 'Show agent memory',
        command: { title: 'Agent Memory', id: 'rovo-dev.agentMemory', tooltip: 'Show agent memory' },
    },
];

export const createSlashCommandProvider = (): monaco.languages.CompletionItemProvider => {
    return {
        triggerCharacters: ['/'],
        provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            const isAtBeginning = /^\s*\/\w*$/.test(textUntilPosition.trimStart());

            if (!isAtBeginning) {
                return { suggestions: [] };
            }

            const match = textUntilPosition.match(/\/\w*$/);
            if (!match) {
                return { suggestions: [] };
            }

            const startColumn = position.column - match[0].length;

            const suggestions: monaco.languages.CompletionItem[] = SLASH_COMMANDS.map((command, index) => ({
                label: command.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: command.insertText,
                range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: startColumn,
                    endColumn: position.column,
                },
                command: command.command,
                sortText: `0${index}`,
                filterText: command.label,
            }));

            return { suggestions };
        },
    };
};

export function removeMonacoStyles() {
    Array.from(document.styleSheets).forEach((stylesheet) => {
        try {
            // Check if this is the monaco-colors stylesheet
            if (stylesheet.ownerNode && (stylesheet.ownerNode as HTMLElement).classList?.contains('monaco-colors')) {
                stylesheet.ownerNode.remove();
            }
        } catch (e) {
            console.warn('Could not access stylesheet:', e);
        }
    });
}
