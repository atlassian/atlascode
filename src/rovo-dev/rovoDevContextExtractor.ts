import * as vscode from 'vscode';

/**
 * Extracts rich context information from code selections to provide better
 * context to Rovo Dev for "Fix" and "Explain" features.
 */

export interface ExtractedContext {
    selectedCode: string;
    surroundingCode: string;
    imports: string;
    languageId: string;
    diagnostics: DiagnosticInfo[];
}

export interface DiagnosticInfo {
    message: string;
    severity: string;
    source?: string;
    code?: string | number;
}

/**
 * Configuration for context extraction
 */
export interface ContextExtractionConfig {
    /** Number of lines to include before the selection */
    linesBefore: number;
    /** Number of lines to include after the selection */
    linesAfter: number;
    /** Whether to extract import statements */
    includeImports: boolean;
    /** Maximum number of import lines to extract */
    maxImportLines: number;
}

const DEFAULT_CONFIG: ContextExtractionConfig = {
    linesBefore: 10,
    linesAfter: 10,
    includeImports: true,
    maxImportLines: 50,
};

/**
 * Extracts comprehensive context from a code selection
 */
export function extractCodeContext(
    document: vscode.TextDocument,
    range: vscode.Range,
    diagnostics: readonly vscode.Diagnostic[],
    config: Partial<ContextExtractionConfig> = {},
): ExtractedContext {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const selectedCode = document.getText(range);
    const surroundingCode = getCodeSection(document, range, finalConfig);
    const imports = finalConfig.includeImports ? extractImports(document, finalConfig.maxImportLines) : '';
    const diagnosticInfo = formatDiagnostics(diagnostics);

    return {
        selectedCode,
        surroundingCode,
        imports,
        languageId: document.languageId,
        diagnostics: diagnosticInfo,
    };
}

/**
 * Extracts code surrounding the selection
 */
function getCodeSection(document: vscode.TextDocument, range: vscode.Range, config: ContextExtractionConfig): string {
    const startLine = Math.max(0, range.start.line - config.linesBefore);
    const endLine = Math.min(document.lineCount - 1, range.end.line + config.linesAfter);

    const surroundingRange = new vscode.Range(
        new vscode.Position(startLine, 0),
        new vscode.Position(endLine, document.lineAt(endLine).text.length),
    );

    return document.getText(surroundingRange);
}

/**
 * Extracts import statements from the beginning of the file
 */
function extractImports(document: vscode.TextDocument, maxLines: number): string {
    const languageId = document.languageId;
    const importPatterns = getImportPatternsForLanguage(languageId);

    if (importPatterns.length === 0) {
        return '';
    }

    const imports: string[] = [];
    const maxLinesToScan = Math.min(maxLines, document.lineCount);

    for (let i = 0; i < maxLinesToScan; i++) {
        const documentLine = document.lineAt(i);
        const trimmedLine = documentLine.text.trim();

        // Stop if we've moved past the import section
        if (
            trimmedLine &&
            !importPatterns.some((pattern) => pattern.test(trimmedLine)) &&
            !isCommentOrEmpty(trimmedLine)
        ) {
            break;
        }

        if (importPatterns.some((pattern) => pattern.test(trimmedLine))) {
            imports.push(documentLine.text);
        }
    }

    return imports.length > 0 ? imports.join('\n') : '';
}

/**
 * Get import patterns for different languages
 */
function getImportPatternsForLanguage(languageId: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
        typescript: [/^\s*import\s+/, /^\s*export\s+/, /^\s*\/\/\/\s*<reference/],
        javascript: [/^\s*import\s+/, /^\s*export\s+/, /^\s*require\(/],
        typescriptreact: [/^\s*import\s+/, /^\s*export\s+/],
        javascriptreact: [/^\s*import\s+/, /^\s*export\s+/],
        python: [/^\s*import\s+/, /^\s*from\s+.+\s+import/],
        java: [/^\s*import\s+/, /^\s*package\s+/],
        csharp: [/^\s*using\s+/],
        go: [/^\s*import\s+/],
        rust: [/^\s*use\s+/, /^\s*extern\s+crate/],
        cpp: [/^\s*#include/],
        c: [/^\s*#include/],
    };

    return patterns[languageId] || [];
}

/**
 * Check if a line is a comment or empty
 */
function isCommentOrEmpty(line: string): boolean {
    const trimmed = line.trim();
    return (
        trimmed === '' ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#')
    );
}

/**
 * Format diagnostics into a structured format
 */
function formatDiagnostics(diagnostics: readonly vscode.Diagnostic[]): DiagnosticInfo[] {
    return diagnostics.map((d) => {
        // Handle different shapes of Diagnostic.code
        // vscode.Diagnostic.code can be a string, number, or an object like { value, target }
        let codeValue: string | number | undefined;

        if (d.code === undefined || d.code === null) {
            codeValue = undefined;
        } else if (typeof d.code === 'object' && 'value' in d.code) {
            // Preserve numeric codes as numbers; otherwise convert to string
            const val = (d.code as any).value;
            codeValue = typeof val === 'number' ? val : String(val);
        } else {
            codeValue = d.code as string | number;
        }

        return {
            message: d.message,
            severity: getSeverityString(d.severity),
            source: d.source,
            code: codeValue,
        };
    });
}

/**
 * Convert diagnostic severity to string
 */
function getSeverityString(severity: vscode.DiagnosticSeverity | undefined): string {
    switch (severity) {
        case vscode.DiagnosticSeverity.Error:
            return 'Error';
        case vscode.DiagnosticSeverity.Warning:
            return 'Warning';
        case vscode.DiagnosticSeverity.Information:
            return 'Information';
        case vscode.DiagnosticSeverity.Hint:
            return 'Hint';
        default:
            return 'Unknown';
    }
}

/**
 * Build a formatted prompt with extracted context
 */
export function buildContextualPrompt(
    basePrompt: string,
    context: ExtractedContext,
    intent: 'fix' | 'explain',
): string {
    const parts: string[] = [];

    // Add the base prompt with enhanced instructions
    if (intent === 'fix') {
        parts.push(`${basePrompt}

Please analyze the following code and provide a fix. Consider:
- The error messages and diagnostics shown
- The surrounding code context
- The imports and dependencies
- Best practices for ${context.languageId}`);
    } else {
        parts.push(`${basePrompt}

Please provide a clear explanation of this code. Include:
- What the code does
- Why it might have issues (if diagnostics are present)
- How it fits with the surrounding context
- Any potential improvements`);
    }

    // Add selected code
    parts.push(`\n**Selected Code:**\n\`\`\`${context.languageId}\n${context.selectedCode}\n\`\`\``);

    // Add diagnostics if present
    if (context.diagnostics.length > 0) {
        parts.push('\n**Diagnostics:**');
        context.diagnostics.forEach((d) => {
            parts.push(`- [${d.severity}] ${d.message}${d.source ? ` (${d.source})` : ''}`);
        });
    }

    // Add surrounding code for context
    if (context.surroundingCode) {
        parts.push(`\n**Surrounding Code Context:**\n\`\`\`${context.languageId}\n${context.surroundingCode}\n\`\`\``);
    }

    // Add imports if present
    if (context.imports) {
        parts.push(`\n**Imports:**\n\`\`\`${context.languageId}\n${context.imports}\n\`\`\``);
    }

    return parts.join('\n');
}
