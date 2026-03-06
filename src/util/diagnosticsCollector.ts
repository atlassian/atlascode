import * as os from 'os';
import { env, version as vscodeVersion } from 'vscode';

import {
    DetailedSiteInfo,
    isBasicAuthInfo,
    isOAuthInfo,
    isPATAuthInfo,
    Product,
    ProductBitbucket,
    ProductJira,
    ProductRovoDev,
} from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';

interface SiteAuthDiagnostics {
    product: string;
    host: string;
    isCloud: boolean;
    authType: string;
    userId: string;
    email: string;
}

interface DiagnosticsInfo {
    vsCodeVersion: string;
    vsCodeEdition: string;
    os: string;
    osVersion: string;
    arch: string;
    extensionVersion: string;
    isRemote: boolean;
    machineId: string;
    authenticatedSites: SiteAuthDiagnostics[];
    jiraEnabled: boolean;
    bitbucketEnabled: boolean;
    rovoDevEnabled: boolean;
}

async function getAuthTypeLabel(site: DetailedSiteInfo): Promise<string> {
    try {
        const authInfo = await Container.credentialManager.getAuthInfo(site, true);
        if (!authInfo) {
            return 'none';
        }
        if (isOAuthInfo(authInfo)) {
            return 'OAuth';
        }
        if (isPATAuthInfo(authInfo)) {
            return 'Personal Access Token (PAT)';
        }
        if (isBasicAuthInfo(authInfo)) {
            // Basic auth on cloud sites means API token
            if (site.isCloud) {
                return 'API Token';
            }
            return 'Basic Auth (username/password)';
        }
        return 'unknown';
    } catch {
        return 'error retrieving auth info';
    }
}

async function getSiteAuthDiagnostics(product: Product): Promise<SiteAuthDiagnostics[]> {
    const sites = Container.siteManager.getSitesAvailable(product);
    const results: SiteAuthDiagnostics[] = [];

    for (const site of sites) {
        const authType = await getAuthTypeLabel(site);
        results.push({
            product: product.name,
            host: site.host,
            isCloud: site.isCloud,
            authType,
            userId: site.userId,
            email: (await Container.credentialManager.getAuthInfo(site, true))?.user.email ?? 'unknown',
        });
    }

    return results;
}

async function getRovoDevAuthDiagnostics(): Promise<SiteAuthDiagnostics[]> {
    try {
        const authInfo = await Container.credentialManager.getRovoDevAuthInfo();
        if (!authInfo) {
            return [];
        }

        let authType = 'unknown';
        if (isOAuthInfo(authInfo)) {
            authType = 'OAuth';
        } else if (isPATAuthInfo(authInfo)) {
            authType = 'Rovo Dev API Token';
        } else if (isBasicAuthInfo(authInfo)) {
            authType = 'API Token';
        }

        return [
            {
                product: ProductRovoDev.name,
                host: 'n/a',
                isCloud: true,
                authType,
                userId: authInfo.user.id,
                email: authInfo.user.email || 'unknown',
            },
        ];
    } catch {
        return [];
    }
}

export async function collectDiagnostics(): Promise<DiagnosticsInfo> {
    const jiraSites = await getSiteAuthDiagnostics(ProductJira);
    const bbSites = await getSiteAuthDiagnostics(ProductBitbucket);
    const rovoDevSites = await getRovoDevAuthDiagnostics();

    return {
        vsCodeVersion: vscodeVersion,
        vsCodeEdition: env.appName,
        os: os.platform(),
        osVersion: os.release(),
        arch: os.arch(),
        extensionVersion: Container.version,
        isRemote: Container.isRemote,
        machineId: env.machineId,
        authenticatedSites: [...jiraSites, ...bbSites, ...rovoDevSites],
        jiraEnabled: Container.config.jira.enabled,
        bitbucketEnabled: Container.config.bitbucket.enabled,
        rovoDevEnabled: Container.isRovoDevEnabled,
    };
}

export function formatDiagnostics(info: DiagnosticsInfo): string {
    const lines: string[] = [];

    lines.push('=== Atlassian Extension Diagnostics ===');
    lines.push('');
    lines.push('--- Environment ---');
    lines.push(`VS Code Version: ${info.vsCodeVersion}`);
    lines.push(`VS Code Edition: ${info.vsCodeEdition}`);
    lines.push(`OS: ${info.os} ${info.osVersion}`);
    lines.push(`Architecture: ${info.arch}`);
    lines.push(`Extension Version: ${info.extensionVersion}`);
    lines.push(`Remote: ${info.isRemote ? 'Yes' : 'No'}`);
    lines.push(`Machine ID: ${info.machineId}`);
    lines.push('');
    lines.push('--- Feature Status ---');
    lines.push(`Jira Enabled: ${info.jiraEnabled}`);
    lines.push(`Bitbucket Enabled: ${info.bitbucketEnabled}`);
    lines.push(`Rovo Dev Enabled: ${info.rovoDevEnabled}`);
    lines.push('');
    lines.push('--- Authenticated Sites ---');

    if (info.authenticatedSites.length === 0) {
        lines.push('No authenticated sites.');
    } else {
        for (const site of info.authenticatedSites) {
            lines.push(`  Product: ${site.product}`);
            lines.push(`    Host: ${site.host}`);
            lines.push(`    Cloud: ${site.isCloud ? 'Yes' : 'No'}`);
            lines.push(`    Auth Type: ${site.authType}`);
            lines.push(`    User: ${site.email}`);
            lines.push('');
        }
    }

    return lines.join('\n');
}

export async function copyLogsAndDiagnostics(): Promise<string> {
    const diagnostics = await collectDiagnostics();
    const diagnosticsText = formatDiagnostics(diagnostics);

    // Get recent logs from the output channel
    const logsSection = [
        '',
        '--- Extension Logs ---',
        'Note: Logs are available in the "Atlassian" output channel.',
        'To view: Open VS Code Output panel (View > Output) and select "Atlassian" from the dropdown.',
        '',
    ].join('\n');

    const fullText = diagnosticsText + logsSection;

    await env.clipboard.writeText(fullText);
    Logger.info('Logs and diagnostics copied to clipboard');

    return fullText;
}
