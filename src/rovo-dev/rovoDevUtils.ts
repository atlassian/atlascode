import * as fs from 'fs';
import path from 'path';
import { window, workspace } from 'vscode';

export type SupportedConfigFiles = 'config.yml' | 'mcp.json' | '.agent.md' | 'rovodev.log';

const FriendlyName: Record<SupportedConfigFiles, string> = {
    'config.yml': 'Rovo Dev settings file',
    'mcp.json': 'Rovo Dev MCP configuration',
    '.agent.md': 'Rovo Dev Global Memory file',
    'rovodev.log': 'Rovo Dev log file',
};

export async function openRovoDevConfigFile(configFile: SupportedConfigFiles) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
        window.showErrorMessage('Could not determine home directory.');
        return;
    }

    const filePath = path.join(home, '.rovodev', configFile);

    // create the file if it doesn't exist
    if (!fs.existsSync(filePath)) {
        switch (configFile) {
            case 'mcp.json':
                fs.writeFileSync(filePath, '{\n    "mcpServers": {}\n}', { flush: true });
                break;
            case '.agent.md':
                fs.writeFileSync(filePath, '', { flush: true });
                break;
        }
    }

    try {
        const doc = await workspace.openTextDocument(filePath);
        await window.showTextDocument(doc);
    } catch (err) {
        window.showErrorMessage(`Could not open ${FriendlyName[configFile]} (${filePath}): ${err}`);
    }
}
