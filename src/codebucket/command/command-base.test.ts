import { expansionCastTo } from 'testsutil';
import * as vscode from 'vscode';

import { Shell } from '../../util/shell';
import { FileDiffQueryParams } from '../../views/pullrequest/diffViewHelper';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { Backend } from '../backend/backend';
import { CommandBase } from './command-base';

// Mock dependencies
jest.mock('../../util/shell');
jest.mock('../backend/backend');
jest.mock('slash', () => {
    return {
        __esModule: true,
        default: (str: string) => str.replace(/\\/g, '/'),
    };
});

// Concrete implementation of CommandBase for testing
class TestCommand extends CommandBase {
    public executeCalled = false;
    public shouldThrowError = false;
    public errorToThrow: Error | string | undefined;

    protected async execute(): Promise<void> {
        this.executeCalled = true;
        if (this.shouldThrowError && this.errorToThrow) {
            throw this.errorToThrow;
        }
    }

    // Expose protected methods for testing
    public async testGetBackend(): Promise<Backend> {
        return this.getBackend();
    }

    public testGetDirectory(): string {
        return this.getDirectory();
    }

    public testGetFilePath(root: string): string {
        return this.getFilePath(root);
    }

    public testGetLineRanges(): string[] {
        return this.getLineRanges();
    }

    public testGetCurrentLine(): number {
        return this.getCurrentLine();
    }

    public testOpenUrl(url: string): void {
        return this.openUrl(url);
    }
}

describe('CommandBase', () => {
    let testCommand: TestCommand;
    let mockTextEditor: Partial<vscode.TextEditor>;
    let mockDocument: Partial<vscode.TextDocument>;
    let mockSelection: Partial<vscode.Selection>;
    let mockShell: jest.Mocked<Shell>;
    let mockBackend: jest.Mocked<Backend>;
    let mockShowInformationMessage: jest.Mock;
    let mockShowErrorMessage: jest.Mock;
    let mockOpenExternal: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Get references to mocked functions
        mockShowInformationMessage = vscode.window.showInformationMessage as jest.Mock;
        mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;
        mockOpenExternal = vscode.env.openExternal as jest.Mock;

        testCommand = new TestCommand();

        mockSelection = {
            start: { line: 5, character: 0 } as vscode.Position,
            end: { line: 10, character: 0 } as vscode.Position,
        };

        mockDocument = {
            uri: {
                scheme: 'file',
                fsPath: '/test/project/src/file.ts',
                query: '',
            } as vscode.Uri,
            fileName: '/test/project/src/file.ts',
        };

        mockTextEditor = {
            document: mockDocument as vscode.TextDocument,
            selection: mockSelection as vscode.Selection,
            selections: [mockSelection as vscode.Selection],
        };

        // Mock Shell
        mockShell = {
            exec: jest.fn(),
        } as any;
        (Shell as jest.MockedClass<typeof Shell>).mockImplementation(() => mockShell);

        // Mock Backend
        mockBackend = {
            root: '/test/project',
        } as any;
        (Backend as jest.MockedClass<typeof Backend>).mockImplementation(() => mockBackend);
        Backend.root = 'git rev-parse --show-toplevel';
    });

    describe('run', () => {
        it('should execute successfully when no error occurs', async () => {
            testCommand.shouldThrowError = false;

            await testCommand.run();

            expect(testCommand.executeCalled).toBe(true);
            expect(mockShowInformationMessage).not.toHaveBeenCalled();
            expect(mockShowErrorMessage).not.toHaveBeenCalled();
        });

        it('should show information message when Error is thrown', async () => {
            const error = new Error('Test error message');
            testCommand.shouldThrowError = true;
            testCommand.errorToThrow = error;

            await testCommand.run();

            expect(testCommand.executeCalled).toBe(true);
            expect(mockShowInformationMessage).toHaveBeenCalledWith('Test error message');
            expect(mockShowErrorMessage).not.toHaveBeenCalled();
        });

        it('should show error message when non-Error is thrown', async () => {
            const error = { message: 'String error' };
            testCommand.shouldThrowError = true;
            testCommand.errorToThrow = error as any;

            await testCommand.run();

            expect(testCommand.executeCalled).toBe(true);
            expect(mockShowInformationMessage).not.toHaveBeenCalled();
            expect(mockShowErrorMessage).toHaveBeenCalledWith('Encountered an unexpected error: String error');
        });
    });

    describe('getBackend', () => {
        beforeEach(() => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;
        });

        it('should return backend when git repository is found', async () => {
            mockShell.exec.mockResolvedValue({ code: 0, stdout: '/test/project\n', stderr: '' });

            const result = await testCommand.testGetBackend();

            expect(result).toBeDefined();
            expect(Shell).toHaveBeenCalledWith('/test/project/src');
            expect(mockShell.exec).toHaveBeenCalledWith('git rev-parse --show-toplevel');
        });

        it('should throw error when no git repository is found', async () => {
            mockShell.exec.mockResolvedValue({ code: 1, stdout: '', stderr: 'not a git repository' });

            await expect(testCommand.testGetBackend()).rejects.toThrow('Unable to find a Git/Hg repository');
        });
    });

    describe('getDirectory', () => {
        it('should return directory of current file for regular files', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetDirectory();

            expect(result).toBe('/test/project/src');
        });

        it('should return repository directory for pull request files', () => {
            const prQueryParams: FileDiffQueryParams = {
                lhs: false,
                repoUri: 'file:///test/repo',
                branchName: 'main',
                commitHash: 'abc123',
                rhsCommitHash: 'def456',
                path: 'src/file.ts',
            };

            const mockPRDocument = {
                uri: {
                    scheme: PullRequestNodeDataProvider.SCHEME,
                    fsPath: '/test/project/src/file.ts',
                    query: JSON.stringify(prQueryParams),
                } as vscode.Uri,
                fileName: '/test/project/src/file.ts',
            };

            const mockPREditor = {
                ...mockTextEditor,
                document: mockPRDocument as vscode.TextDocument,
            };

            expansionCastTo<any>(vscode.window).activeTextEditor = mockPREditor;

            // Mock vscode.Uri.parse to return the expected fsPath
            const originalUriParse = vscode.Uri.parse;
            vscode.Uri.parse = jest.fn().mockReturnValue({ fsPath: '/test/repo' });

            const result = testCommand.testGetDirectory();

            expect(result).toBe('/test/repo');
            expect(vscode.Uri.parse).toHaveBeenCalledWith('file:///test/repo');

            // Restore original
            vscode.Uri.parse = originalUriParse;
        });
    });

    describe('getFilePath', () => {
        it('should return relative path for regular files', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetFilePath('/test/project');

            expect(result).toBe('src/file.ts');
        });

        it('should return path from query params for pull request files', () => {
            const prQueryParams: FileDiffQueryParams = {
                lhs: false,
                repoUri: 'file:///test/repo',
                branchName: 'main',
                commitHash: 'abc123',
                rhsCommitHash: 'def456',
                path: 'src/file.ts',
            };

            const mockPRDocument = {
                uri: {
                    scheme: PullRequestNodeDataProvider.SCHEME,
                    fsPath: '/test/project/src/file.ts',
                    query: JSON.stringify(prQueryParams),
                } as vscode.Uri,
                fileName: '/test/project/src/file.ts',
            };

            const mockPREditor = {
                ...mockTextEditor,
                document: mockPRDocument as vscode.TextDocument,
            };

            expansionCastTo<any>(vscode.window).activeTextEditor = mockPREditor;

            const result = testCommand.testGetFilePath('/test/project');

            expect(result).toBe('src/file.ts');
        });
    });

    describe('getLineRanges', () => {
        it('should return line ranges in correct format', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetLineRanges();

            expect(result).toEqual(['6:11']); // 5+1:10+1 (0-based to 1-based conversion)
        });

        it('should handle multiple selections', () => {
            const secondSelection = {
                start: { line: 15, character: 0 } as vscode.Position,
                end: { line: 20, character: 0 } as vscode.Position,
            };

            mockTextEditor!.selections = [mockSelection as vscode.Selection, secondSelection as vscode.Selection];

            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetLineRanges();

            expect(result).toEqual(['6:11', '16:21']);
        });

        it('should handle single line selection', () => {
            const singleLineSelection = {
                start: { line: 5, character: 0 } as vscode.Position,
                end: { line: 5, character: 10 } as vscode.Position,
            };

            mockTextEditor!.selections = [singleLineSelection as vscode.Selection];

            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetLineRanges();

            expect(result).toEqual(['6:6']);
        });

        it('should handle zero-based line numbers correctly', () => {
            const zeroBasedSelection = {
                start: { line: 0, character: 0 } as vscode.Position,
                end: { line: 0, character: 10 } as vscode.Position,
            };

            mockTextEditor!.selections = [zeroBasedSelection as vscode.Selection];

            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetLineRanges();

            expect(result).toEqual(['1:1']);
        });
    });

    describe('getCurrentLine', () => {
        it('should return 1-based line number of current selection', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetCurrentLine();

            expect(result).toBe(6); // 5+1 (0-based to 1-based conversion)
        });

        it('should handle zero-based line numbers correctly', () => {
            const zeroBasedSelection = {
                start: { line: 0, character: 0 } as vscode.Position,
                end: { line: 0, character: 10 } as vscode.Position,
            };

            mockTextEditor!.selection = zeroBasedSelection as vscode.Selection;

            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = testCommand.testGetCurrentLine();

            expect(result).toBe(1); // 0+1 (0-based to 1-based conversion)
        });
    });

    describe('openUrl', () => {
        it('should open URL using VS Code API', () => {
            const url = 'https://example.com';
            const mockUri = { toString: () => url };

            // Mock vscode.Uri.parse to return the expected URI
            const originalUriParse = vscode.Uri.parse;
            vscode.Uri.parse = jest.fn().mockReturnValue(mockUri);

            testCommand.testOpenUrl(url);

            expect(vscode.Uri.parse).toHaveBeenCalledWith(url);
            expect(mockOpenExternal).toHaveBeenCalledWith(mockUri);

            // Restore original
            vscode.Uri.parse = originalUriParse;
        });

        it('should handle complex URLs with query parameters', () => {
            const url = 'https://example.com/path?param=value&another=test';
            const mockUri = { toString: () => url };

            // Mock vscode.Uri.parse to return the expected URI
            const originalUriParse = vscode.Uri.parse;
            vscode.Uri.parse = jest.fn().mockReturnValue(mockUri);

            testCommand.testOpenUrl(url);

            expect(vscode.Uri.parse).toHaveBeenCalledWith(url);
            expect(mockOpenExternal).toHaveBeenCalledWith(mockUri);

            // Restore original
            vscode.Uri.parse = originalUriParse;
        });
    });

    describe('getOpenEditor', () => {
        it('should return active text editor when available', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;

            const result = CommandBase.getOpenEditor();

            expect(result).toBe(mockTextEditor);
        });

        it('should throw error when no active editor', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = undefined;

            expect(() => CommandBase.getOpenEditor()).toThrow('No open editor');
        });

        it('should throw error when activeTextEditor is null', () => {
            expansionCastTo<any>(vscode.window).activeTextEditor = null;

            expect(() => CommandBase.getOpenEditor()).toThrow('No open editor');
        });
    });

    describe('error handling in getBackend', () => {
        beforeEach(() => {
            expansionCastTo<any>(vscode.window).activeTextEditor = mockTextEditor;
        });

        it('should handle shell execution errors gracefully', async () => {
            mockShell.exec.mockRejectedValue(new Error('Shell execution failed'));

            await expect(testCommand.testGetBackend()).rejects.toThrow('Shell execution failed');
        });

        it('should handle multiple backend failures', async () => {
            mockShell.exec.mockResolvedValue({ code: 1, stdout: '', stderr: 'not a git repository' });

            await expect(testCommand.testGetBackend()).rejects.toThrow('Unable to find a Git/Hg repository');
        });
    });

    describe('edge cases', () => {
        it('should handle empty file paths', () => {
            const emptyPathDocument = {
                uri: {
                    scheme: 'file',
                    fsPath: '',
                    query: '',
                } as vscode.Uri,
                fileName: '',
            };

            const emptyPathEditor = {
                ...mockTextEditor,
                document: emptyPathDocument as vscode.TextDocument,
            };

            expansionCastTo<any>(vscode.window).activeTextEditor = emptyPathEditor;

            const result = testCommand.testGetDirectory();

            expect(result).toBe('.');
        });

        it('should handle malformed PR query parameters', () => {
            const malformedQueryDocument = {
                uri: {
                    scheme: PullRequestNodeDataProvider.SCHEME,
                    fsPath: '/test/project/src/file.ts',
                    query: 'invalid-json',
                } as vscode.Uri,
                fileName: '/test/project/src/file.ts',
            };

            const malformedQueryEditor = {
                ...mockTextEditor,
                document: malformedQueryDocument as vscode.TextDocument,
            };

            expansionCastTo<any>(vscode.window).activeTextEditor = malformedQueryEditor;

            expect(() => testCommand.testGetDirectory()).toThrow();
        });
    });
});
