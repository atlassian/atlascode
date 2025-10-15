import * as fs from 'fs';
import { window, workspace } from 'vscode';

import { RovoDevStatusResponse } from './responseParserInterfaces';

export type SupportedConfigFiles = '.rovodev/config.yml' | '.rovodev/mcp.json' | '.rovodev/.agent.md';

export async function openRovoDevConfigFile(configFile: SupportedConfigFiles, friendlyName: string) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
        window.showErrorMessage('Could not determine home directory.');
        return;
    }

    const filePath = `${home}/${configFile}`;

    // create the file if it doesn't exist
    if (!fs.existsSync(filePath)) {
        switch (configFile) {
            case '.rovodev/mcp.json':
                fs.writeFileSync(filePath, '{\n    "mcpServers": {}\n}', { flush: true });
                break;
            case '.rovodev/.agent.md':
                fs.writeFileSync(filePath, '', { flush: true });
                break;
        }
    }

    try {
        const doc = await workspace.openTextDocument(filePath);
        await window.showTextDocument(doc);
    } catch (err) {
        window.showErrorMessage(`Could not open ${friendlyName} (${filePath}): ${err}`);
    }
}

export function statusJsonResponseToMarkdown(response: RovoDevStatusResponse): string {
    const data = response.data;

    let buffer = '';
    buffer += '**Rovo Dev**\n';
    buffer += `- Session ID: ${data.cliVersion.sessionId}\n`;
    buffer += `- Version: ${data.cliVersion.version}\n`;
    buffer += '\n';

    buffer += '**Working directory**\n';
    buffer += `- ${data.workingDirectory}\n`;
    buffer += '\n';

    buffer += '**Account**\n';
    buffer += `- Email: ${data.account.email}\n`;
    buffer += `- Atlassian account ID: ${data.account.accountId}\n`;
    buffer += `- Atlassian organisation ID: ${data.account.orgId}\n`;
    buffer += '\n';

    if (data.memory.hasMemoryFiles) {
        buffer += '**Memory**\n';
        for (const memFile of data.memory.memoryPaths) {
            buffer += `- ${memFile}\n`;
        }
        buffer += '\n';
    }

    buffer += '**Model**\n';
    buffer += `- ${data.model.humanReadableName}`;

    return buffer;
}

export function JsonToMarkdown(data: Record<string, any>): string {
    return parse(0, data);
}

function mdIndent(indent: number, text: string) {
    return indent ? ' '.repeat(indent) + `- ${text}` : text;
}

function parse(indent: number, data: Record<string, any>): string {
    let buffer = '';

    for (const key in data) {
        const value = data[key];
        switch (typeof value) {
            case 'string':
            case 'boolean':
            case 'number':
            case 'bigint':
            case 'undefined':
                buffer += mdIndent(indent, `**${key}**: ${value}\n`);
                break;

            case 'object':
                if (value === null) {
                    buffer += mdIndent(indent, `**${key}**: null\n`);
                } else {
                    buffer += mdIndent(indent, `**${key}**:\n`);
                    buffer += parse(indent + 2, value) + '\n';
                }
                break;
        }
    }

    return buffer;
}
