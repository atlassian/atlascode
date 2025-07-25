/**
 * RovoDevDecorator
 *
 * Handles displaying a keybinding annotation in the editor when a selection is present.
 * The annotation is shown only if enabled via the `atlascode.rovodev.showKeybinding` setting.
 * Decoration updates automatically on selection, editor, and configuration changes.
 */
import { Disposable, Range, window, workspace } from 'vscode';

export class RovoDevDecorator implements Disposable {
    private enabled: boolean;
    private keybindingDecoration;

    constructor() {
        this.enabled = this.getEnabledSetting();
        this.keybindingDecoration = window.createTextEditorDecorationType({
            after: {
                contentText: RovoDevDecorator.buildKeybindingLabel(),
                color: '#888888',
            },
        });
        this.updateKeybindingDecoration();
        window.onDidChangeActiveTextEditor(this.updateKeybindingDecoration, this, []);
        window.onDidChangeTextEditorSelection(this.updateKeybindingDecoration, this, []);
        window.onDidChangeTextEditorVisibleRanges(this.updateKeybindingDecoration, this, []);
        workspace.onDidChangeConfiguration(this.onConfigChange, this, []);
    }

    private static buildKeybindingLabel(): string {
        const isMac = process.platform === 'darwin';
        const cmdKey = isMac ? '⌘' : 'Ctrl';
        const altKey = isMac ? '⌥' : 'Alt';
        return '\u2003'.repeat(10) + `${cmdKey} + ${altKey} + A: send to Rovo Dev`;
    }

    private getEnabledSetting(): boolean {
        return workspace.getConfiguration('atlascode.rovodev').get('showKeybinding', true);
    }

    private onConfigChange() {
        this.enabled = this.getEnabledSetting();
        this.updateKeybindingDecoration();
    }

    public updateKeybindingDecoration(): void {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        if (!this.enabled) {
            editor.setDecorations(this.keybindingDecoration, []);
            return;
        }
        const decorations = editor.selections
            .filter((selection) => !selection.isEmpty)
            .map((selection) => {
                const cursorLine = selection.active.line;
                const line = editor.document.lineAt(cursorLine);
                return {
                    range: new Range(cursorLine, line.text.length, cursorLine, line.text.length),
                };
            });
        editor.setDecorations(this.keybindingDecoration, decorations);
    }

    public dispose(): void {
        this.keybindingDecoration.dispose();
    }
}
