import * as fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { window, workspace } from 'vscode';

import {
    RovoDevMessageWithCtaLink,
    RovoDevModelsResponse,
    RovoDevPromptsResponse,
    RovoDevStatusResponse,
    RovoDevUsageResponse,
} from './client';

export type SupportedConfigFiles = 'config.yml' | 'mcp.json' | '.agent.md' | 'rovodev.log';

const FriendlyName: Record<SupportedConfigFiles, string> = {
    'config.yml': 'Rovo Dev settings file',
    'mcp.json': 'Rovo Dev MCP configuration',
    '.agent.md': 'Rovo Dev Global Memory file',
    'rovodev.log': 'Rovo Dev log file',
};

// Read logging.path from ~/.rovodev/config.yml if present.
function getLogPathFromConfig(home: string): string | undefined {
    const configPath = path.join(home, '.rovodev', 'config.yml');
    if (!fs.existsSync(configPath)) {
        return undefined;
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.load(raw) as { logging?: { path?: string } } | undefined;
        const logPath = config?.logging?.path;
        if (typeof logPath !== 'string' || !logPath.trim()) {
            return undefined;
        }
        const trimmed = logPath.trim();
        const expanded = trimmed.startsWith('~') ? path.join(home, trimmed.slice(1).replace(/^[/\\]+/, '')) : trimmed;
        return path.normalize(expanded);
    } catch {
        return undefined;
    }
}

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

function getRovoDevLogFilePath(): string | undefined {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
        return undefined;
    }
    const configPath = getLogPathFromConfig(home);
    if (configPath) {
        return configPath;
    }

    // Fallback to old log file location if log path is not set in config.yml
    const rovoDevDir = path.join(home, '.rovodev');
    const candidates = [path.join(rovoDevDir, 'logs', 'rovodev.log'), path.join(rovoDevDir, 'rovodev.log')];
    return candidates.find((p) => fs.existsSync(p));
}

export function readLastNLogLines(n: number = 10): string[] {
    const logFilePath = getRovoDevLogFilePath();
    if (!logFilePath || !fs.existsSync(logFilePath)) {
        return ['rovo dev log file could not be found'];
    }

    try {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim() !== '');
        return lines.slice(-n);
    } catch (err) {
        return [`error reading rovo dev log file: ${err}`];
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
    buffer += `- ${parseCustomCliTagsForMarkdown(data.model.humanReadableName, [])}`;

    return buffer;
}

export function usageJsonResponseToMarkdown(response: RovoDevUsageResponse): {
    usage_response: string;
    alert_message?: RovoDevMessageWithCtaLink;
} {
    const data = response.data.content;

    const numberFormatter = new Intl.NumberFormat();

    let buffer = '';

    if (data.isBetaSite) {
        buffer += `**${data.title}**\n`;
        buffer += `- Used: ${numberFormatter.format(data.credit_used)}\n`;
        buffer += `- Remaining: ${numberFormatter.format(data.credit_remaining)}\n`;
        buffer += `- Resets in: ${formatElapsedTime(data.retry_after_seconds)}\n`;
        buffer += '\n';

        if (data.model_usage_data && Object.keys(data.model_usage_data.data).length > 0) {
            const modelData = data.model_usage_data.data;

            buffer += `**${data.model_usage_data.title}**\n`;

            for (const key in modelData) {
                buffer += `- ${key}: ${numberFormatter.format(modelData[key])}\n`;
            }
        }
    } else {
        // If credit_total returns -1, it means unlimited credits
        const remaining = data.credit_total === -1 ? 'Unlimited' : numberFormatter.format(data.credit_remaining);
        const total = data.credit_total === -1 ? 'Unlimited' : numberFormatter.format(data.credit_total);

        buffer += `**${data.title}**\n`;
        buffer += `- Used: ${numberFormatter.format(data.credit_used)}\n`;
        buffer += `- Remaining: ${remaining}\n`;
        buffer += `- Total: ${total}\n`;
        buffer += '\n';
    }

    if (data.view_usage_message) {
        const view_usage_message = data.view_usage_message.message;
        if (data.view_usage_message.ctaLink) {
            buffer += view_usage_message.replace('{ctaLink}', data.view_usage_message.ctaLink.link);
        } else {
            buffer += view_usage_message;
        }
    }

    return { usage_response: buffer, alert_message: data.exceeded_message };
}

export function promptsJsonResponseToMarkdown(response: RovoDevPromptsResponse): string {
    const data = response.data.prompts;

    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }

    let buffer = '';

    for (const prompt of data) {
        buffer += `**${prompt.name}**\n- ${prompt.description}\n- ${prompt.content_file}\n\n`;
    }

    return buffer;
}

export function modelsJsonResponseToMarkdown(
    response: RovoDevModelsResponse,
): { title: string; text: string; agentModelChanged: boolean } | undefined {
    const data = response.data;

    if (data.message) {
        return {
            title: 'Agent model changed',
            text: data.message,
            agentModelChanged: true,
        };
    } else if (!Array.isArray(data.models) || data.models.length === 0) {
        return undefined;
    }

    let buffer = '';

    for (const model of data.models) {
        buffer += `**${model.model_id}**\n- ${model.description}\n- Credit multiplier: ${model.credit_multiplier}x\n\n`;
    }

    return {
        title: 'Available models',
        text: buffer,
        agentModelChanged: false,
    };
}

function formatText(text: string, cliTags: string[], links: { text: string; link: string }[]) {
    if (cliTags.includes('italic')) {
        text = `*${text}*`;
    }
    if (cliTags.includes('bold')) {
        text = `**${text}**`;
    }

    const linkIndex = cliTags.findIndex((x) => x.startsWith('link='));
    if (linkIndex >= 0) {
        const link = cliTags[linkIndex].substring('link='.length);
        links.push({ text, link });
        text = '{link' + links.length + '}';
    }
    return text;
}

function formatElapsedTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor((seconds % 3600) % 60);

    if (h === 0 && m === 0 && s === 0) {
        return '0s';
    }

    const hDisplay = h > 0 ? h + 'h ' : '';
    const mDisplay = m > 0 ? m + 'm ' : '';

    if (hDisplay) {
        return (hDisplay + mDisplay).trim();
    } else {
        const sDisplay = s > 0 ? s + 's' : '';
        return (mDisplay + sDisplay).trim();
    }
}

// this function doesn't work well with nested identical tags - hopefully we don't need that
export function parseCustomCliTagsForMarkdown(text: string, links: { text: string; link: string }[]): string {
    // no valid tags
    if (!text || !text.includes('[/') || !text.includes(']', text.indexOf('['))) {
        return text;
    }

    const firstTagPosition = text.indexOf('[');

    // handle unopened tags
    if (text[firstTagPosition + 1] === '/') {
        const startingPosition = text.indexOf(']', firstTagPosition) + 1;
        return (
            text.substring(0, startingPosition) + parseCustomCliTagsForMarkdown(text.substring(startingPosition), links)
        );
    }

    const firstTagContent = text.substring(firstTagPosition + 1, text.indexOf(']'));
    const closingTagPosition = firstTagContent.startsWith('link=')
        ? text.indexOf('[/link]')
        : text.indexOf('[/' + firstTagContent + ']');

    // handle unclosed tags
    if (closingTagPosition === -1) {
        const startingPosition = text.indexOf(']', firstTagPosition) + 1;
        return (
            text.substring(0, startingPosition) + parseCustomCliTagsForMarkdown(text.substring(startingPosition), links)
        );
    }

    const contentWithinTags = text.substring(text.indexOf(']', firstTagPosition) + 1, closingTagPosition);
    const afterTags = text.indexOf(']', closingTagPosition) + 1;

    return (
        text.substring(0, firstTagPosition) +
        formatText(parseCustomCliTagsForMarkdown(contentWithinTags, links), firstTagContent.split(' '), links) +
        parseCustomCliTagsForMarkdown(text.substring(afterTags), links)
    );
}

export function removeCustomCliTags(text: string): string {
    return text.replace(/\[\/?[^\]]+]/g, '');
}
