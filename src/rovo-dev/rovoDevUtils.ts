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
