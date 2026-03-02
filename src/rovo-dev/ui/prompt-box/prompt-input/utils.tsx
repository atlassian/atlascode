import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { SavedPrompt } from '../../utils';

export const createMonacoPromptEditor = (container: HTMLElement) => {
    /* Disable web workers in Monaco by providing a dummy implementation 
        Monaco web workers cannot be instantiated in vscode webview */
    window.MonacoEnvironment = {
        getWorker: function (_moduleId, label) {
            return {
                postMessage: () => {},
                terminate: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                onmessage: () => {},
                dispatchEvent: () => false,
                onmessageerror: () => {},
                onerror: () => {},
            };
        },
    };
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
        suggest: {
            showIcons: false,
        },

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
        label: '/copy',
        insertText: '/copy',
        description: 'Copy the last response to clipboard',
        command: { title: 'Copy', id: 'rovo-dev.copyResponse', tooltip: 'Copy the last response to clipboard' },
    },
    {
        label: '/feedback',
        insertText: '/feedback',
        description: 'Provide feedback on Rovo Dev',
        command: { title: 'Feedback', id: 'rovo-dev.triggerFeedback', tooltip: 'Provide feedback on Rovo Dev' },
    },
    {
        label: '/memory',
        insertText: '/memory',
        description: 'Show agent memory',
        command: { title: 'Agent Memory', id: 'rovo-dev.agentMemory', tooltip: 'Show agent memory' },
    },
    {
        label: '/models',
        insertText: '/models',
        description: 'Show available agent models',
        command: {
            title: 'Models',
            id: 'rovo-dev.triggerAgentModels',
            tooltip: 'Show available agent models',
        },
    },
    {
        label: '/prompts',
        insertText: '!',
        description: 'Show saved prompts',
        command: {
            title: 'Prompts',
            id: 'rovo-dev.triggerPrompts',
            tooltip: 'Show saved prompts',
        },
    },
    {
        label: '/prune',
        insertText: '/prune',
        description: 'Prune the chat',
        command: { title: 'Prune', id: 'rovo-dev.pruneChat', tooltip: 'Prune the chat' },
    },
    {
        label: '/status',
        insertText: '/status',
        description: 'Show Rovo Dev status including version, account details and model',
        command: {
            title: 'Status',
            id: 'rovo-dev.triggerStatus',
            tooltip: 'Show Rovo Dev status including version, account details and model',
        },
    },
    {
        label: '/usage',
        insertText: '/usage',
        description: 'Show Rovo Dev credit usage',
        command: {
            title: 'Usage',
            id: 'rovo-dev.triggerUsage',
            tooltip: 'Show Rovo Dev credit usage',
        },
    },
    {
        label: '/yolo',
        insertText: '/yolo',
        description: 'Toggle tool confirmations',
        command: { title: 'Yolo Mode', id: 'rovo-dev.toggleYoloMode', tooltip: 'Toggle tool confirmations' },
    },
    {
        label: '/ask',
        insertText: '/ask ',
        description: 'Ask a question in read-only mode (no file changes or terminal access)',
        command: { title: 'Ask Mode', id: 'rovo-dev.invokeAskMode', tooltip: 'Invoke Ask mode' },
    },
    {
        label: '/sessions',
        insertText: '/sessions',
        description: 'View and manage your agent sessions',
        command: { title: 'Sessions', id: 'rovo-dev.triggerSessions', tooltip: 'View and manage your agent sessions' },
    },
];

export const createSlashCommandProvider = (commands: SlashCommand[]): monaco.languages.CompletionItemProvider => {
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

            const suggestions: monaco.languages.CompletionItem[] = commands.map((command, index) => ({
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
                detail: command.description,
            }));

            return { suggestions };
        },
    };
};

export function createPromptCompletionProvider(
    fetch: () => Promise<SavedPrompt[]>,
    canFetch: boolean,
): monaco.languages.CompletionItemProvider {
    return {
        triggerCharacters: ['!'],
        provideCompletionItems: async (model, position) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            const match = textUntilPosition.match(/(?:^|\s)!\w*$/);
            if (!match) {
                return { suggestions: [] };
            }

            const startColumn = position.column - match[0].trimStart().length;
            let prompts: SavedPrompt[] = [];
            if (!canFetch) {
                prompts = [{ name: 'Initializing...', description: '', content_file: '' }];
            } else {
                prompts = await fetch();
            }
            const suggestions: monaco.languages.CompletionItem[] = prompts.map((prompt, index) => ({
                label: prompt.name === 'Initializing...' ? 'Initializing...' : `!${prompt.name} `,
                kind: monaco.languages.CompletionItemKind.File,
                insertText: prompt.name === 'Initializing...' ? '' : `!${prompt.name} `,
                documentation: prompt.description,
                range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: startColumn,
                    endColumn: position.column,
                },
                sortText: `0${index}`,
                filterText: `!${prompt.name}`,
            }));

            return { suggestions };
        },
    };
}

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

export function setupMonacoCommands(
    editor: monaco.editor.IStandaloneCodeEditor,
    onSend: (text: string) => boolean,
    onCopy: () => void,
    handleMemoryCommand: () => void,
    handleTriggerFeedbackCommand: () => void,
    handleSessionCommand?: () => void,
    onYoloModeToggled?: () => void,
) {
    monaco.editor.registerCommand('rovo-dev.clearChat', () => {
        if (onSend('/clear')) {
            editor.setValue('');
        }
    });

    monaco.editor.registerCommand('rovo-dev.pruneChat', () => {
        if (onSend('/prune')) {
            editor.setValue('');
        }
    });

    monaco.editor.registerCommand('rovo-dev.copyResponse', () => {
        editor.setValue('');
        onCopy();
    });

    monaco.editor.registerCommand('rovo-dev.agentMemory', () => {
        handleMemoryCommand();
        editor.setValue('');
    });

    monaco.editor.registerCommand('rovo-dev.triggerPrompts', () => {
        // Trigger suggestions for saved prompts
        editor.trigger('keyboard', 'editor.action.triggerSuggest', { auto: true });
    });

    monaco.editor.registerCommand('rovo-dev.triggerStatus', () => {
        if (onSend('/status')) {
            editor.setValue('');
        }
    });

    monaco.editor.registerCommand('rovo-dev.triggerUsage', () => {
        if (onSend('/usage')) {
            editor.setValue('');
        }
    });

    monaco.editor.registerCommand('rovo-dev.triggerAgentModels', () => {
        if (onSend('/models')) {
            editor.setValue('');
        }
    });

    if (onYoloModeToggled) {
        monaco.editor.registerCommand('rovo-dev.toggleYoloMode', () => {
            onYoloModeToggled();
            editor.setValue('');
        });
    }

    monaco.editor.registerCommand('rovo-dev.triggerFeedback', () => {
        handleTriggerFeedbackCommand();
        editor.setValue('');
    });

    if (handleSessionCommand) {
        monaco.editor.registerCommand('rovo-dev.triggerSessions', () => {
            handleSessionCommand();
            editor.setValue('');
        });
    }
}

export function setupPromptKeyBindings(editor: monaco.editor.IStandaloneCodeEditor, handleSend: () => void) {
    editor.addCommand(monaco.KeyCode.Enter, () => handleSend(), '!suggestWidgetVisible'); // Only trigger if suggestions are not visible

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        editor.trigger('keyboard', 'type', { text: '\n' });
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        // disable default find action and trigger our own if needed
    });

    // Tab key moves focus to the next focusable element (for keyboard accessibility)
    editor.addCommand(
        monaco.KeyCode.Tab,
        () => {
            const container = editor.getContainerDomNode();
            const promptContainer = container.closest('.prompt-container');
            if (promptContainer) {
                const focusableElements = promptContainer.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                );
                for (const element of focusableElements) {
                    if (!container.contains(element)) {
                        element.focus();
                        return;
                    }
                }
            }
        },
        '!suggestWidgetVisible',
    );

    // Shift+Tab moves focus to the previous focusable element
    editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Tab,
        () => {
            const container = editor.getContainerDomNode();
            const promptContainer = container.closest('.prompt-container');
            if (promptContainer) {
                const allFocusable = document.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                );
                const focusableArray = Array.from(allFocusable);
                const editorIndex = focusableArray.findIndex((el) => container.contains(el));
                if (editorIndex > 0) {
                    focusableArray[editorIndex - 1].focus();
                }
            }
        },
        '!suggestWidgetVisible',
    );
}

// Auto-resize functionality
export function setupAutoResize(editor: monaco.editor.IStandaloneCodeEditor, maxHeight = 200) {
    const updateHeight = () => {
        const contentHeight = Math.min(maxHeight, editor.getContentHeight());
        const container = editor.getContainerDomNode();
        container.style.height = `${contentHeight}px`;
        editor.layout();
    };

    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
}
