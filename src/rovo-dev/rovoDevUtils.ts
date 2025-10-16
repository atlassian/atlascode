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
    buffer += `- Atlassian organization ID: ${data.account.orgId}\n`;
    buffer += '\n';

    if (data.memory.hasMemoryFiles) {
        buffer += '**Memory**\n';
        for (const memFile of data.memory.memoryPaths) {
            buffer += `- ${memFile}\n`;
        }
        buffer += '\n';
    }

    buffer += '**Model**\n';
    buffer += `- ${parseCustomCliTagsForMarkdown(data.model.humanReadableName)}`;

    return buffer;
}

function formatText(text: string, cliTags: string[]) {
    if (cliTags.includes('italic')) {
        text = `*${text}*`;
    }
    if (cliTags.includes('bold')) {
        text = `**${text}**`;
    }
    return text;
}

// this function doesn't work well with nested identical tags - hopefully we don't need that
export function parseCustomCliTagsForMarkdown(text: string): string {
    // no valid tags
    if (!text || !text.includes('[/') || !text.includes(']', text.indexOf('['))) {
        return text;
    }

    const firstTagPosition = text.indexOf('[');

    // handle unopened tags
    if (text[firstTagPosition + 1] === '/') {
        const startingPosition = text.indexOf(']', firstTagPosition) + 1;
        return text.substring(0, startingPosition) + parseCustomCliTagsForMarkdown(text.substring(startingPosition));
    }

    const firstTagContent = text.substring(firstTagPosition + 1, text.indexOf(']'));
    const closingTagPosition = text.indexOf('[/' + firstTagContent + ']');

    // handle unclosed tags
    if (closingTagPosition === -1) {
        const startingPosition = text.indexOf(']', firstTagPosition) + 1;
        return text.substring(0, startingPosition) + parseCustomCliTagsForMarkdown(text.substring(startingPosition));
    }

    const contentWithinTags = text.substring(text.indexOf(']', firstTagPosition) + 1, closingTagPosition);
    const afterTags = text.indexOf(']', closingTagPosition) + 1;

    return (
        text.substring(0, firstTagPosition) +
        formatText(parseCustomCliTagsForMarkdown(contentWithinTags), firstTagContent.split(' ')) +
        parseCustomCliTagsForMarkdown(text.substring(afterTags))
    );
}
