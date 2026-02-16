import * as fs from 'fs';
import debounce from 'lodash.debounce';
import path from 'path';
import { RovoDevViewResponse } from 'src/rovo-dev/ui/rovoDevViewMessages';
import { Range, TextEditor, Uri, window, workspace } from 'vscode';

import { RovoDevContextItem, RovoDevFileContext, RovoDevJiraContext } from './rovoDevTypes';
import { TypedWebview } from './rovoDevWebviewProvider';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

interface DropResourceBlob {
    resource: {
        fsPath: string;
        path: string;
    };
    languageId: string;
}

interface FileContextQuickPickItem {
    label: string;
    description: string;
    uri: Uri;
    absolutePath: string;
    relativePath: string;
    name: string;
}
export class RovoDevChatContextProvider {
    private _webview: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;

    // group context by type
    private _fileContext: RovoDevFileContext[] = [];
    private _jiraContext: RovoDevJiraContext[] = [];

    public get context(): RovoDevContextItem[] {
        return Array<RovoDevContextItem>().concat(this._jiraContext).concat(this._fileContext);
    }

    public setWebview(webview: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined) {
        this._webview = webview;
    }

    public async executeAddContext(): Promise<void> {
        const picked = await this.selectContextItem();
        if (!picked) {
            return;
        }

        await this.addContextItem(picked);
    }

    public async processDragDropData(dragDropData: string[]) {
        // search for a Jira work item
        if (dragDropData.find((x) => x.includes('atlascode.views.jira.assignedWorkItemsTreeView'))) {
            const uri = URL.parse(dragDropData[0] || dragDropData[1]);
            if (uri?.hostname.endsWith('.atlassian.net')) {
                const urlString = uri.toString();
                await this.addContextItem({
                    contextType: 'jiraWorkItem',
                    name: urlString.substring(urlString.lastIndexOf('/') + 1),
                    url: urlString,
                });
            }
        }

        // if it's a recognizable format, we should get a JSON payload for it
        const jsonBlobs = (() => {
            try {
                const str = dragDropData.find((x) => x.startsWith(`[{"resource":{"$mid":1,`));
                return str ? (JSON.parse(str) as DropResourceBlob[]) : undefined;
            } catch {
                return undefined;
            }
        })();

        if (jsonBlobs) {
            for (const jsonBlob of jsonBlobs) {
                // search for a file dragged from the Explorer view
                const fsPath = jsonBlob.resource.fsPath || jsonBlob.resource.path;
                if (fsPath && fs.existsSync(fsPath)) {
                    await this.addContextItem({
                        contextType: 'file',
                        isFocus: false,
                        file: {
                            name: path.basename(fsPath),
                            absolutePath: fsPath,
                        },
                        enabled: true,
                    });
                }
            }
        }
    }

    public async forceUserFocusUpdate(editor: TextEditor | undefined = window.activeTextEditor, selection?: Range) {
        if (!this._webview) {
            return;
        }

        selection = selection || (editor ? editor.selection : undefined);

        if (!editor) {
            await this.removeFocusedFileItem();
            return;
        }

        const fileInfo = this.getOpenFileInfo(editor.document);
        if (fileInfo.absolutePath !== '' && fs.existsSync(fileInfo.absolutePath)) {
            const fileSelection =
                selection && !selection.isEmpty ? { start: selection.start.line, end: selection.end.line } : undefined;

            await this.addContextItem({
                contextType: 'file',
                isFocus: true,
                file: fileInfo,
                selection: fileSelection,
                enabled: true,
            });
        }
    }

    private async fetchFileContextItems(pattern: string, fetchLimit?: number) {
        const files = await workspace.findFiles(pattern, '**/node_modules/**', fetchLimit);

        if (!files.length) {
            console.log('No files found in workspace for pattern:', pattern);
            return [];
        }

        return files.map((uri) => {
            const workspaceFolder = workspace.getWorkspaceFolder(uri);
            const absolutePath = uri.fsPath;
            const relativePath = workspaceFolder ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath) : uri.fsPath;
            const name = path.basename(uri.fsPath);
            return {
                label: name,
                description: relativePath,
                uri,
                absolutePath,
                relativePath,
                name,
            };
        });
    }

    private async selectContextItem(): Promise<RovoDevContextItem | undefined> {
        const initItems = await this.fetchFileContextItems('**/*', 100);

        if (!initItems.length) {
            window.showInformationMessage('No files found in workspace to add as context.');
            return;
        }

        const contextQuickPick = window.createQuickPick<FileContextQuickPickItem>();
        contextQuickPick.placeholder = 'Select a file to add to the chat context';
        contextQuickPick.items = initItems;
        contextQuickPick.matchOnDescription = true;

        const debouncedFetch = debounce(async (value: string) => {
            contextQuickPick.busy = true;
            const filteredItems = await this.fetchFileContextItems(`**/*${value}*`, 100);

            contextQuickPick.items = filteredItems;
            contextQuickPick.busy = false;
        }, 300);

        contextQuickPick.onDidChangeValue(async (value) => {
            if (value === '') {
                contextQuickPick.items = initItems;
                return;
            }

            debouncedFetch(value);
        });

        contextQuickPick.show();

        const pickedItem = await new Promise<FileContextQuickPickItem | undefined>((resolve) => {
            contextQuickPick.onDidAccept(() => {
                resolve(contextQuickPick.selectedItems[0]);
                contextQuickPick.dispose();
            });
            contextQuickPick.onDidHide(() => {
                resolve(undefined);
                contextQuickPick.dispose();
            });
        });

        if (!pickedItem) {
            return;
        }

        return {
            contextType: 'file',
            isFocus: false,
            file: {
                name: pickedItem.name,
                absolutePath: pickedItem.absolutePath,
            },
            selection: undefined,
            enabled: true,
        };
    }

    public addContextItem(newItem: RovoDevContextItem) {
        let index: number;

        switch (newItem.contextType) {
            case 'file':
                index = this._fileContext.findIndex((x) => x.file.absolutePath === newItem.file.absolutePath);
                if (index < 0) {
                    // same file not found, append
                    this._fileContext.push(newItem);
                } else if (!newItem.isFocus || this._fileContext[index].isFocus) {
                    // never replace explicitely added with focused
                    this._fileContext[index] = newItem;
                } else {
                    // duplicate found, ignore
                }
                break;

            case 'jiraWorkItem':
                index = this._jiraContext.findIndex((x) => x.url === newItem.url);
                if (index === -1) {
                    // only add it if it's not duplicate
                    this._jiraContext.push(newItem);
                }
                break;
        }

        return this.updateView();
    }

    public removeContextItem(item: RovoDevContextItem) {
        switch (item.contextType) {
            case 'file':
                this._fileContext = this._fileContext.filter((x) => x.file.absolutePath !== item.file.absolutePath);
                break;

            case 'jiraWorkItem':
                this._jiraContext = this._jiraContext.filter((x) => x.url !== item.url);
                break;
        }

        return this.updateView();
    }

    public toggleFocusedContextFile(enabled: boolean) {
        const index = this._fileContext.findIndex((x) => x.isFocus);
        if (index >= 0) {
            this._fileContext[index].enabled = enabled;
            return this.updateView();
        } else {
            return Promise.resolve(false);
        }
    }

    private removeFocusedFileItem() {
        this._fileContext = this._fileContext.filter((x) => !x.isFocus);
        return this.updateView();
    }

    private updateView() {
        const webview = this._webview!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.SetChatContext,
            context: this.context,
        });
    }

    // Helper to get openFile info from a document
    private getOpenFileInfo = (doc: { uri: Uri; fileName: string }) => {
        const workspaceFolder = workspace.getWorkspaceFolder(doc.uri);
        const baseName = doc.fileName.split(path.sep).pop() || '';
        return {
            name: baseName,
            absolutePath: doc.uri.fsPath,
            relativePath: workspaceFolder ? path.relative(workspaceFolder.uri.fsPath, doc.uri.fsPath) : doc.fileName,
        };
    };
}
