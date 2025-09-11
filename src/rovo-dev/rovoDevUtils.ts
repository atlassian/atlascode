import * as fs from 'fs';
import { window, workspace } from 'vscode';

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
