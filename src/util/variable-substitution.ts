import * as os from 'os';
import * as vscode from 'vscode';

function substituteVariables(text: string, variables: Record<string, string>): string {
    // Replace all variables in the format ${variableName}
    return text.replace(/\${([^}]+)}/g, (match, varName) => {
        return variables[varName] || match;
    });
}

/**
 * We have created this function to allow standard values provided by VSCode in its various settings.
 * For now we support only `${userHome}` but this can be extended to other variables as needed.
 */
function substitute(text: string): string {
    const variables = {
        userHome: os.homedir(),
        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', // legacy
    };

    return substituteVariables(text, variables);
}

export { substitute };
