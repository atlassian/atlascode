import * as fs from 'fs';
import * as path from 'path';
import { Uri, window, workspace } from 'vscode';

import { addRecommendedExtensionTriggeredEvent } from '../analytics';
import { Container } from '../container';
import { Logger } from '../logger';

const ATLASCODE_EXTENSION_ID = 'atlassian.atlascode';
const VSCODE_FOLDER = '.vscode';
const EXTENSIONS_JSON_FILE = 'extensions.json';

interface ExtensionsJson {
    recommendations?: string[];
}

export async function addAtlascodeAsRecommendedExtension(source: string = 'commandPalette'): Promise<void> {
    // Track command triggered
    addRecommendedExtensionTriggeredEvent(source).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    try {
        // Get the workspace folder
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('No workspace folder is open. Please open a workspace or folder first.');
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const vscodeDir = path.join(workspacePath, VSCODE_FOLDER);
        const extensionsJsonPath = path.join(vscodeDir, EXTENSIONS_JSON_FILE);

        // Ensure .vscode directory exists
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
            Logger.info('Created .vscode directory');
        }

        let extensionsConfig: ExtensionsJson = {};

        // Read existing extensions.json if it exists
        if (fs.existsSync(extensionsJsonPath)) {
            try {
                const existingContent = fs.readFileSync(extensionsJsonPath, 'utf8');
                extensionsConfig = JSON.parse(existingContent);
                Logger.info('Read existing extensions.json file');
            } catch (error) {
                Logger.error(error, 'Failed to parse existing extensions.json file');
                window.showErrorMessage('Failed to parse existing extensions.json file. Please check its syntax.');
                return;
            }
        }

        // Initialize recommendations array if it doesn't exist
        if (!extensionsConfig.recommendations) {
            extensionsConfig.recommendations = [];
        }

        // Check if atlascode is already recommended
        if (extensionsConfig.recommendations.includes(ATLASCODE_EXTENSION_ID)) {
            window.showInformationMessage('Atlassian extension is already in the recommended extensions list.');
            return;
        }

        // Add atlascode to recommendations
        extensionsConfig.recommendations.push(ATLASCODE_EXTENSION_ID);

        // Write the updated extensions.json file
        try {
            const updatedContent = JSON.stringify(extensionsConfig, null, 4);
            fs.writeFileSync(extensionsJsonPath, updatedContent, 'utf8');

            Logger.info('Successfully added Atlassian extension to recommendations');
            window.showInformationMessage(
                'Successfully added Atlassian extension to workspace recommendations! ' +
                    'Team members will now see a suggestion to install this extension when they open the workspace.',
            );

            // Optionally open the extensions.json file to show the user what was added
            const shouldOpenFile = await window.showInformationMessage(
                'Would you like to view the extensions.json file?',
                'Yes',
                'No',
            );

            if (shouldOpenFile === 'Yes') {
                const doc = await workspace.openTextDocument(Uri.file(extensionsJsonPath));
                await window.showTextDocument(doc);
            }
        } catch (error) {
            Logger.error(error, 'Failed to write extensions.json file');
            window.showErrorMessage('Failed to write extensions.json file. Please check file permissions.');
        }
    } catch (error) {
        Logger.error(error, 'Failed to add recommended extension');
        window.showErrorMessage('Failed to add recommended extension. Please see the output channel for details.');
    }
}
