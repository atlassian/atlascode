import * as vscode from 'vscode';

import { RovoDevCodeActionProvider } from './rovoDevCodeActionProvider';

// Mock path module
jest.mock('path', () => ({
    __esModule: true,
    default: {
        sep: '/',
        relative: jest.fn((from: string, to: string) => to.replace(from, '').replace(/^\//, '')),
    },
}));

// Mock ExtensionApi to prevent initialization errors
jest.mock('./api/extensionApi', () => ({
    ExtensionApi: jest.fn().mockImplementation(() => ({
        metadata: {
            isDebugging: jest.fn(() => false),
            isBoysenberry: jest.fn(() => false),
            isRovoDevEnabled: jest.fn(() => true),
            version: jest.fn(() => '1.0.0'),
            appInstanceId: jest.fn(() => 'test-app-id'),
        },
        config: {
            isDebugPanelEnabled: jest.fn(() => false),
            isThinkingBlockEnabled: jest.fn(() => false),
            onDidChange: jest.fn(),
        },
        analytics: {
            sendTrackEvent: jest.fn(),
        },
        jira: {
            getSites: jest.fn(() => []),
        },
    })),
}));

describe('RovoDevCodeActionProvider', () => {
    let provider: RovoDevCodeActionProvider;
    let mockDocument: vscode.TextDocument;
    let mockRange: vscode.Range;
    let mockContext: vscode.CodeActionContext;

    beforeEach(() => {
        provider = new RovoDevCodeActionProvider();
        mockDocument = {
            fileName: '/test/path/file.ts',
            uri: {
                fsPath: '/test/path/file.ts',
                scheme: 'file',
                path: '/test/path/file.ts',
            } as vscode.Uri,
        } as vscode.TextDocument;
        mockRange = new vscode.Range(0, 0, 1, 0);

        // Mock workspace.getWorkspaceFolder
        (vscode.workspace.getWorkspaceFolder as jest.Mock) = jest.fn().mockReturnValue({
            uri: {
                fsPath: '/test/path',
                scheme: 'file',
                path: '/test/path',
            },
            name: 'test-workspace',
            index: 0,
        });
    });

    describe('generateCommand', () => {
        it('should handle diagnostic messages with newlines', () => {
            const diagnosticWithNewline: vscode.Diagnostic = {
                message: "Error: Property 'foo' is missing\n  in type 'Bar'\n  but required in type 'Baz'",
                range: mockRange,
                severity: vscode.DiagnosticSeverity.Error,
            };

            mockContext = {
                diagnostics: [diagnosticWithNewline],
                only: undefined,
                triggerKind: 1, // CodeActionTriggerKind.Automatic
            };

            const action = provider.generateCommand(
                'Fix by Rovo Dev',
                'Please fix',
                mockDocument,
                mockRange,
                mockContext,
            );

            expect(action.command?.arguments).toBeDefined();
            const prompt = action.command?.arguments![0] as string;

            // Newlines should be replaced with spaces
            expect(prompt).toContain("Error: Property 'foo' is missing   in type 'Bar'   but required in type 'Baz'");
            expect(prompt).not.toContain('\n  in type');
        });

        it('should handle multiple diagnostics with special characters', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    message: 'Type error: Expected "string" but got "number"',
                    range: mockRange,
                    severity: vscode.DiagnosticSeverity.Error,
                },
                {
                    message: 'ESLint: Missing semicolon\nSee: https://eslint.org/docs/rules/semi',
                    range: mockRange,
                    severity: vscode.DiagnosticSeverity.Warning,
                },
            ];

            mockContext = {
                diagnostics,
                only: undefined,
                triggerKind: 1, // CodeActionTriggerKind.Automatic
            };

            const action = provider.generateCommand(
                'Fix by Rovo Dev',
                'Please fix',
                mockDocument,
                mockRange,
                mockContext,
            );

            expect(action.command?.arguments).toBeDefined();
            const prompt = action.command?.arguments![0] as string;

            // Should contain both diagnostic messages, sanitized
            expect(prompt).toContain('Type error: Expected "string" but got "number"');
            expect(prompt).toContain('ESLint: Missing semicolon See: https://eslint.org/docs/rules/semi');
        });

        it('should handle empty diagnostics', () => {
            mockContext = {
                diagnostics: [],
                only: undefined,
                triggerKind: 1, // CodeActionTriggerKind.Automatic
            };

            const action = provider.generateCommand(
                'Explain by Rovo Dev',
                'Please explain',
                mockDocument,
                mockRange,
                mockContext,
            );

            expect(action.command?.arguments).toBeDefined();
            const prompt = action.command?.arguments![0] as string;

            // Should just be the original prompt without additional context
            expect(prompt).toBe('Please explain');
            expect(prompt).not.toContain('Additional problem context');
        });

        it('should sanitize carriage returns and multiple consecutive newlines', () => {
            const diagnostic: vscode.Diagnostic = {
                message: 'Error message\r\n\r\nwith multiple\r\nline breaks',
                range: mockRange,
                severity: vscode.DiagnosticSeverity.Error,
            };

            mockContext = {
                diagnostics: [diagnostic],
                only: undefined,
                triggerKind: 1, // CodeActionTriggerKind.Automatic
            };

            const action = provider.generateCommand(
                'Fix by Rovo Dev',
                'Please fix',
                mockDocument,
                mockRange,
                mockContext,
            );

            expect(action.command?.arguments).toBeDefined();
            const prompt = action.command?.arguments![0] as string;

            // All line breaks should be replaced with single spaces
            expect(prompt).toContain('Error message with multiple line breaks');
            expect(prompt).not.toContain('\r');
            expect(prompt).not.toContain('\n\n');
        });
    });
});
