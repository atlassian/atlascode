import * as monaco from 'monaco-editor';

export const createMonacoPromptEditor = (container: HTMLElement) => {
    const rootStyles = getComputedStyle(document.documentElement);

    monaco.editor.defineTheme('no-colors-theme', {
        base: 'vs-dark',
        inherit: false, // Don't inherit any colors
        rules: [],
        colors: {
            'editor.foreground': rootStyles.getPropertyValue('--vscode-input-foreground').trim(),
            'editor.background': rootStyles.getPropertyValue('--vscode-input-background').trim(),
            'editor.lineHighlightBackground': 'transparent',
            'editor.selectionBackground': rootStyles.getPropertyValue('--vscode-editor-selectionBackground').trim(),
            'editorCursor.foreground': rootStyles.getPropertyValue('--vscode-editorCursor-foreground').trim(),
        }, // Empty colors object prevents color injection
    });

    return monaco.editor.create(container, {
        // Basic editor options
        value: '',
        language: 'plaintext', // Or 'plaintext' for simple prompts]
        theme: 'no-colors-theme',
        // Layout and appearance
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
        // Scrolling behavior
        scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            verticalScrollbarSize: 8,
            alwaysConsumeMouseWheel: false,
        },

        // Auto-sizing
        automaticLayout: true,
        domReadOnly: false,
        readOnly: false,

        // Suggestions and IntelliSense
        quickSuggestions: false,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'off',
        wordBasedSuggestions: 'off',

        // Accessibility
        accessibilitySupport: 'auto',

        // Cursor and selection
        cursorBlinking: 'blink',
        cursorStyle: 'line',
        selectOnLineNumbers: false,

        // Disable features not needed for prompts
        codeLens: false,
        contextmenu: false,
        find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'never',
        },

        // Multi-line support
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
];

export const createSlashCommandProvider = (): monaco.languages.CompletionItemProvider => {
    return {
        triggerCharacters: ['/'],
        provideCompletionItems: (model, position) => {
            // Get the entire value of the editor
            // Get text from start of document to current position
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Only trigger if:
            // 1. We're at the very beginning of the document (position 1,1 or 1,2 for '/')
            // 2. OR the entire text before cursor is just whitespace + '/' + optional characters
            const isAtBeginning = /^\s*\/\w*$/.test(textUntilPosition.trimStart());

            if (!isAtBeginning) {
                return { suggestions: [] };
            }

            // Find the start of the slash command
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
                sortText: `0${index}`, // Ensure our commands appear first
                filterText: command.label,
            }));

            return { suggestions };
        },
    };
};
