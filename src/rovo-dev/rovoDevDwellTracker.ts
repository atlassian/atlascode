import { basename } from 'path';
import { Disposable, window } from 'vscode';

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
    private dwellTimer: NodeJS.Timeout | undefined;

    constructor(
        private readonly telemetry: RovoDevTelemetryProvider,
        private readonly getCurrentPromptId: () => string,
        private readonly rovodevApiClient: RovoDevApiClient | undefined,
        private readonly dwellMs: number = 5000,
    ) {
        // Listen for editor changes
        this.disposables.push(window.onDidChangeActiveTextEditor(() => this.onEditorFocusChanged()));

        this.startDwellTimer();
    }

    private onEditorFocusChanged() {
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

        const editorAtStart = window.activeTextEditor;

        if (!editorAtStart) {
            return;
        }

        const doc = editorAtStart.document;
        if (!doc || doc.isUntitled || (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'vscode-userdata')) {
            return;
        }

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

            if (this.rovodevApiClient === undefined) {
                return;
            }

            try {
                const filename = basename(current.document.uri.fsPath);

                // If this succeeds, the file has a pre-Rovo Dev cached version, meaning it was modified by Rovo Dev
                await this.rovodevApiClient.getCacheFilePath(filename);

                // Fire analytics: one-per-prompt deduping is handled by telemetry provider
                this.telemetry.fireTelemetryEvent('rovoDevAiResultViewedEvent', promptId, this.dwellMs);
            } catch {
                // Not a Rovo Dev modified file or API not ready; ignore silently
            }
        }, this.dwellMs);
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
