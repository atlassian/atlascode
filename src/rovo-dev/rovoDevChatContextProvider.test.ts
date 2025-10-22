import * as fs from 'fs';
import { Range, TextEditor, Uri, workspace } from 'vscode';

import { RovoDevChatContextProvider } from './rovoDevChatContextProvider';
import { RovoDevFileContext, RovoDevJiraContext } from './rovoDevTypes';
import { TypedWebview } from './rovoDevWebviewProvider';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

jest.mock('fs');
jest.mock('vscode');

const mockFs = jest.mocked(fs);

describe('RovoDevChatContextProvider', () => {
    let provider: RovoDevChatContextProvider;
    let mockWebview: jest.Mocked<TypedWebview<RovoDevProviderMessage, any>>;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new RovoDevChatContextProvider();

        mockWebview = {
            postMessage: jest.fn().mockResolvedValue(undefined),
        } as any;

        // Default mock implementations
        mockFs.existsSync.mockReturnValue(true);
    });

    describe('setWebview', () => {
        it('should set the webview', () => {
            provider.setWebview(mockWebview);
            expect((provider as any)._webview).toBe(mockWebview);
        });

        it('should allow setting webview to undefined', () => {
            provider.setWebview(mockWebview);
            provider.setWebview(undefined);
            expect((provider as any)._webview).toBeUndefined();
        });
    });

    describe('context getter', () => {
        it('should return empty array when no context items exist', () => {
            expect(provider.context).toEqual([]);
        });

        it('should return context items in order: jira first, then files', async () => {
            provider.setWebview(mockWebview);

            const fileContext: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const jiraContext: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-123',
                url: 'https://example.atlassian.net/browse/PROJ-123',
            };

            await provider.addContextItem(jiraContext);
            await provider.addContextItem(fileContext);

            const context = provider.context;
            expect(context).toHaveLength(2);
            expect(context[0]).toEqual(jiraContext);
            expect(context[1]).toEqual(fileContext);
        });
    });

    describe('addContextItem', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should add a new file context item', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(item);
        });

        it('should add a new jira context item', async () => {
            const item: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-123',
                url: 'https://example.atlassian.net/browse/PROJ-123',
            };

            await provider.addContextItem(item);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(item);
        });

        it('should not add duplicate jira work items', async () => {
            const item: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-123',
                url: 'https://example.atlassian.net/browse/PROJ-123',
            };

            await provider.addContextItem(item);
            await provider.addContextItem(item);

            expect(provider.context).toHaveLength(1);
        });

        it('should replace file context with same path if not replacing focused with focused', async () => {
            const item1: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const item2: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: false,
            };

            await provider.addContextItem(item1);
            await provider.addContextItem(item2);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(item2);
        });

        it('should not replace explicitly added file with focused file', async () => {
            const explicitItem: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const focusedItem: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(explicitItem);
            await provider.addContextItem(focusedItem);

            expect(provider.context).toHaveLength(1);
            const item = provider.context[0];
            if (item.contextType === 'file') {
                expect(item.isFocus).toBe(false);
            }
        });

        it('should allow replacing focused file with another focused file', async () => {
            const focusedItem1: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const focusedItem2: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: false,
            };

            await provider.addContextItem(focusedItem1);
            await provider.addContextItem(focusedItem2);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(focusedItem2);
        });

        it('should post message to webview after adding context', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.SetChatContext,
                context: provider.context,
            });
        });
    });

    describe('removeContextItem', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should remove file context item by absolute path', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);
            expect(provider.context).toHaveLength(1);

            await provider.removeContextItem(item);
            expect(provider.context).toHaveLength(0);
        });

        it('should remove jira context item by url', async () => {
            const item: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-123',
                url: 'https://example.atlassian.net/browse/PROJ-123',
            };

            await provider.addContextItem(item);
            expect(provider.context).toHaveLength(1);

            await provider.removeContextItem(item);
            expect(provider.context).toHaveLength(0);
        });

        it('should not remove non-matching items', async () => {
            const item1: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test1.ts', absolutePath: '/path/to/test1.ts' },
                enabled: true,
            };

            const item2: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test2.ts', absolutePath: '/path/to/test2.ts' },
                enabled: true,
            };

            await provider.addContextItem(item1);
            await provider.addContextItem(item2);

            await provider.removeContextItem(item1);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(item2);
        });

        it('should post message to webview after removing context', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);
            mockWebview.postMessage.mockClear();

            await provider.removeContextItem(item);

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.SetChatContext,
                context: provider.context,
            });
        });
    });

    describe('toggleFocusedContextFile', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should enable focused file context', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: false,
            };

            await provider.addContextItem(item);
            await provider.toggleFocusedContextFile(true);

            const contextItem = provider.context[0];
            if (contextItem.contextType === 'file') {
                expect(contextItem.enabled).toBe(true);
            }
        });

        it('should disable focused file context', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);
            await provider.toggleFocusedContextFile(false);

            const contextItem = provider.context[0];
            if (contextItem.contextType === 'file') {
                expect(contextItem.enabled).toBe(false);
            }
        });

        it('should post message to webview after toggling', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);
            mockWebview.postMessage.mockClear();

            await provider.toggleFocusedContextFile(false);

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.SetChatContext,
                context: provider.context,
            });
        });

        it('should return false promise if no focused file exists', async () => {
            const item: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            await provider.addContextItem(item);
            mockWebview.postMessage.mockClear();
            const result = await provider.toggleFocusedContextFile(false);

            expect(result).toBe(false);
            expect(mockWebview.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('forceUserFocusUpdate', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should remove focused file when editor is undefined', async () => {
            const focusedItem: RovoDevFileContext = {
                contextType: 'file',
                isFocus: true,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const unfocusedItem: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'other.ts', absolutePath: '/path/to/other.ts' },
                enabled: true,
            };

            await provider.addContextItem(focusedItem);
            await provider.addContextItem(unfocusedItem);

            await provider.forceUserFocusUpdate(undefined);

            expect(provider.context).toHaveLength(1);
            expect(provider.context[0]).toEqual(unfocusedItem);
        });

        it('should do nothing if no webview is set', async () => {
            provider.setWebview(undefined);

            const mockEditor = {
                document: {
                    uri: Uri.file('/path/to/test.ts'),
                    fileName: 'test.ts',
                },
                selection: new Range(0, 0, 5, 0),
            } as unknown as TextEditor;

            await provider.forceUserFocusUpdate(mockEditor);

            expect(mockWebview.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('executeAddContext', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should do nothing when no files found in workspace', async () => {
            (workspace.findFiles as jest.Mock).mockResolvedValue([]);

            await provider.executeAddContext();

            expect(provider.context).toHaveLength(0);
        });
    });

    describe('processDragDropData', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should skip files that do not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const jsonBlob = JSON.stringify([
                {
                    resource: {
                        $mid: 1,
                        fsPath: '/nonexistent/test.ts',
                    },
                    languageId: 'typescript',
                },
            ]);

            const dragDropData = [jsonBlob];

            await provider.processDragDropData(dragDropData);

            expect(provider.context).toHaveLength(0);
        });

        it('should handle invalid JSON gracefully', async () => {
            const dragDropData = ['invalid-json{', 'some-other-data'];

            await provider.processDragDropData(dragDropData);

            expect(provider.context).toHaveLength(0);
        });
    });

    describe('edge cases and integration', () => {
        beforeEach(() => {
            provider.setWebview(mockWebview);
        });

        it('should handle mixed jira and file context items', async () => {
            const fileItem: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test.ts', absolutePath: '/path/to/test.ts' },
                enabled: true,
            };

            const jiraItem: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-123',
                url: 'https://example.atlassian.net/browse/PROJ-123',
            };

            await provider.addContextItem(fileItem);
            await provider.addContextItem(jiraItem);

            expect(provider.context).toHaveLength(2);
            expect(provider.context[0]).toEqual(jiraItem);
            expect(provider.context[1]).toEqual(fileItem);
        });

        it('should maintain correct order after adding and removing items', async () => {
            const file1: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test1.ts', absolutePath: '/path/to/test1.ts' },
                enabled: true,
            };

            const file2: RovoDevFileContext = {
                contextType: 'file',
                isFocus: false,
                file: { name: 'test2.ts', absolutePath: '/path/to/test2.ts' },
                enabled: true,
            };

            const jira1: RovoDevJiraContext = {
                contextType: 'jiraWorkItem',
                name: 'PROJ-1',
                url: 'https://example.atlassian.net/browse/PROJ-1',
            };

            await provider.addContextItem(file1);
            await provider.addContextItem(jira1);
            await provider.addContextItem(file2);

            expect(provider.context).toHaveLength(3);
            expect(provider.context[0]).toEqual(jira1);

            await provider.removeContextItem(file1);

            expect(provider.context).toHaveLength(2);
            expect(provider.context[0]).toEqual(jira1);
            expect(provider.context[1]).toEqual(file2);
        });
    });
});
