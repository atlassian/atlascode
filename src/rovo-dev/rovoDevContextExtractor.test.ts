import * as vscode from 'vscode';

import { buildContextualPrompt, extractCodeContext } from './rovoDevContextExtractor';

describe('rovoDevContextExtractor', () => {
    describe('extractCodeContext', () => {
        let mockDocument: vscode.TextDocument;

        beforeEach(() => {
            // Create a mock document
            const content = `import { Component } from 'react';
import { useState } from 'react';

export function MyComponent() {
    const [count, setCount] = useState(0);
    
    function handleClick() {
        setCount(count + 1);
    }
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={handleClick}>
                Increment
            </button>
        </div>
    );
}`;

            mockDocument = {
                uri: vscode.Uri.file('/test/file.tsx'),
                fileName: '/test/file.tsx',
                isUntitled: false,
                languageId: 'typescriptreact',
                version: 1,
                isDirty: false,
                isClosed: false,
                eol: vscode.EndOfLine.LF,
                lineCount: content.split('\n').length,
                getText: (range?: vscode.Range): string => {
                    if (!range) {
                        return content;
                    }
                    const lines = content.split('\n');
                    const start = range.start.line;
                    const end = range.end.line;
                    return lines.slice(start, end + 1).join('\n');
                },
                getWordRangeAtPosition: () => undefined,
                lineAt: (line: number): vscode.TextLine => ({
                    lineNumber: line,
                    text: content.split('\n')[line],
                    range: new vscode.Range(line, 0, line, content.split('\n')[line].length),
                    rangeIncludingLineBreak: new vscode.Range(line, 0, line, content.split('\n')[line].length + 1),
                    firstNonWhitespaceCharacterIndex: 0,
                    isEmptyOrWhitespace: false,
                }),
                offsetAt: () => 0,
                positionAt: () => new vscode.Position(0, 0),
                validateRange: (range: vscode.Range) => range,
                validatePosition: (position: vscode.Position) => position,
                save: async () => true,
            } as any;
        });

        it('should extract selected code', () => {
            const range = new vscode.Range(new vscode.Position(6, 4), new vscode.Position(8, 19));
            const diagnostics: vscode.Diagnostic[] = [];

            const context = extractCodeContext(mockDocument, range, diagnostics);

            expect(context.selectedCode).toContain('setCount(count + 1)');
            expect(context.languageId).toBe('typescriptreact');
        });

        it('should extract surrounding code', () => {
            const range = new vscode.Range(new vscode.Position(6, 4), new vscode.Position(8, 19));
            const diagnostics: vscode.Diagnostic[] = [];

            const context = extractCodeContext(mockDocument, range, diagnostics);

            expect(context.surroundingCode).toContain('function handleClick');
            expect(context.surroundingCode).toContain('return (');
        });

        it('should extract imports', () => {
            const range = new vscode.Range(new vscode.Position(6, 4), new vscode.Position(8, 19));
            const diagnostics: vscode.Diagnostic[] = [];

            const context = extractCodeContext(mockDocument, range, diagnostics);

            expect(context.imports).toContain("import { Component } from 'react'");
            expect(context.imports).toContain("import { useState } from 'react'");
        });

        it('should format diagnostics', () => {
            const range = new vscode.Range(new vscode.Position(6, 4), new vscode.Position(8, 19));
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(new vscode.Position(6, 4), new vscode.Position(6, 12)),
                    message: 'Test error message',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'eslint',
                    code: 'no-unused-vars',
                } as vscode.Diagnostic,
            ];

            const context = extractCodeContext(mockDocument, range, diagnostics);

            expect(context.diagnostics).toHaveLength(1);
            expect(context.diagnostics[0].message).toBe('Test error message');
            expect(context.diagnostics[0].severity).toBe('Error');
        });
    });

    describe('buildContextualPrompt', () => {
        it('should build a prompt for fix intent', () => {
            const basePrompt = 'Please fix problem with this code';
            const context = {
                selectedCode: 'const x = undefined.foo;',
                surroundingCode: 'function test() { const x = undefined.foo; }',
                imports: "import { something } from 'lib';",
                languageId: 'typescript',
                diagnostics: [
                    {
                        message: 'Cannot read property of undefined',
                        severity: 'Error',
                        source: 'typescript',
                    },
                ],
            };

            const prompt = buildContextualPrompt(basePrompt, context, 'fix');

            expect(prompt).toContain('Please fix problem with this code');
            expect(prompt).toContain('const x = undefined.foo;');
            expect(prompt).toContain('Cannot read property of undefined');
            expect(prompt).toContain('typescript');
        });

        it('should build a prompt for explain intent', () => {
            const basePrompt = 'Please explain what is the problem with this code';
            const context = {
                selectedCode: 'const result = items.map(x => x * 2);',
                surroundingCode: 'function process() { const result = items.map(x => x * 2); }',
                imports: "import { map } from 'lodash';",
                languageId: 'javascript',
                diagnostics: [],
            };

            const prompt = buildContextualPrompt(basePrompt, context, 'explain');

            expect(prompt).toContain('Please explain');
            expect(prompt).toContain('items.map(x => x * 2)');
            expect(prompt).toContain('javascript');
        });

        it('should include diagnostics when present', () => {
            const basePrompt = 'Fix this';
            const context = {
                selectedCode: 'let x = 1;',
                surroundingCode: 'let x = 1;',
                imports: '',
                languageId: 'javascript',
                diagnostics: [
                    { message: 'Unexpected var', severity: 'Warning', source: 'eslint' },
                    { message: 'Unused variable', severity: 'Error', source: 'eslint' },
                ],
            };

            const prompt = buildContextualPrompt(basePrompt, context, 'fix');

            expect(prompt).toContain('Unexpected var');
            expect(prompt).toContain('Unused variable');
            expect(prompt).toContain('Warning');
            expect(prompt).toContain('Error');
        });
    });
});
