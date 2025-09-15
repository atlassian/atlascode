import { Disposable, TextEditor, window } from 'vscode';

import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

/**
 * Tracks when a user dwells on a file that has been modified by Rovo Dev and fires an analytics event.
 * Global listener: catches navigation via explorer, tabs, etc. Not limited to clicks from the Rovo Dev UI.
 *
 * The RovoDevTelemetryProvider already dedupes the same telemetry function per promptId,
 * so this tracker simply attempts to fire the event; the provider ensures only one fires per prompt.
 */
export class RovoDevDwellTracker implements Disposable {
    private disposables: Disposable[] = [];

    private activeEditor: TextEditor | undefined;
    private dwellTimer: NodeJS.Timeout | undefined;

    constructor(
        private readonly telemetry: RovoDevTelemetryProvider,
        private readonly getCurrentPromptId: () => string,
        private readonly getApiClient: () => RovoDevApiClient | undefined,
        private readonly dwellMs: number = 5000,
    ) {
        this.activeEditor = window.activeTextEditor;

        // Listen for editor changes and visible range changes (scrolling)
        this.disposables.push(window.onDidChangeActiveTextEditor((e) => this.onEditorFocusChanged(e)));
        this.disposables.push(
            window.onDidChangeTextEditorVisibleRanges((e) => {
                if (e.textEditor === this.activeEditor) {
                    this.startDwellTimer();
                }
            }),
        );

        this.startDwellTimer();
    }

    private onEditorFocusChanged(editor: TextEditor | undefined) {
        this.activeEditor = editor;
        this.startDwellTimer();
    }

    private clearDwellTimer() {
        if (this.dwellTimer) {
            clearTimeout(this.dwellTimer);
            this.dwellTimer = undefined;
        }
    }

    public startDwellTimer() {
        this.clearDwellTimer();

        if (!this.activeEditor) {
            return;
        }

        const doc = this.activeEditor.document;
        if (!doc || doc.isUntitled || (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'vscode-userdata')) {
            return;
        }

        const editorAtStart = this.activeEditor;
        const uriAtStart = doc.uri.toString();

        this.dwellTimer = setTimeout(async () => {
            // Ensure we are still on the same editor and document
            const current = window.activeTextEditor;
            if (!current || current !== editorAtStart || current.document.uri.toString() !== uriAtStart) {
                return;
            }

            const promptId = this.getCurrentPromptId();
            if (!promptId) {
                // We only report when associated with an active prompt
                return;
            }

            try {
                const client = this.getApiClient();
                if (!client) {
                    return;
                }
                const filename = this.getFileNamefromPath(current.document.uri.fsPath);
                if (filename === undefined) {
                    return;
                }

                // If this succeeds, the file has a pre-Rovo Dev cached version, meaning it was modified by Rovo Dev
                await client.getCacheFilePath(filename);

                // Fire analytics: one-per-prompt deduping is handled by telemetry provider
                this.telemetry.fireTelemetryEvent('rovoDevAiResultViewedEvent', promptId, this.dwellMs);
            } catch {
                // Not a Rovo Dev modified file or API not ready; ignore silently
            }
        }, this.dwellMs);
    }

    private getFileNamefromPath(path: string): string | undefined {
        if (path === undefined) {
            return undefined;
        }
        // Support windows and unix paths
        const parts = path.split('\\')?.pop()?.split('/');
        return parts?.pop();
    }

    dispose(): void {
        this.clearDwellTimer();
        for (const d of this.disposables) {
            try {
                d.dispose();
            } catch {}
        }
        this.disposables = [];
    }
}
