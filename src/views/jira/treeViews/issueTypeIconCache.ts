import { createHash } from 'crypto';
import { Uri, workspace } from 'vscode';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { Container } from '../../../container';
import { getAgent, getAxiosInstance } from '../../../jira/jira-client/providers';
import { Logger } from '../../../logger';

const ICON_DIR = 'issuetype-icons';
const MAX_ICON_BYTES = 100 * 1024;
// Short timeout: the first tree render awaits the prefetch.
const ICON_REQUEST_TIMEOUT_MS = 5000;

// VS Code blocks http(s) resources whose path ends in .svg, so such icons are copied locally.
const localUris = new Map<string, Uri>();
const downloads = new Map<string, Promise<void>>();

interface IconIssue {
    issuetype?: { iconUrl?: string };
    siteDetails?: DetailedSiteInfo;
    children?: ReadonlyArray<IconIssue>;
}

function stripPort(host: string): string {
    return host.replace(/:\d+$/, '').toLowerCase();
}

export function needsLocalIconCopy(iconUrl: string | undefined, site: { host: string } | undefined): boolean {
    if (!iconUrl || !site?.host) {
        return false;
    }
    try {
        const url = new URL(iconUrl);
        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.pathname.toLowerCase().endsWith('.svg') &&
            url.hostname.toLowerCase() === stripPort(site.host)
        );
    } catch {
        return false;
    }
}

export function issueTypeIconUri(iconUrl: string): Uri {
    return localUris.get(iconUrl) ?? Uri.parse(iconUrl);
}

// The workbench CSP rejects the vscode-userdata scheme for images; the same path as a file: Uri is allowed.
function toRenderableUri(target: Uri): Uri {
    return target.scheme === 'vscode-userdata' ? Uri.file(target.fsPath) : target;
}

async function download(iconUrl: string, site: DetailedSiteInfo): Promise<void> {
    try {
        const res = await getAxiosInstance()(iconUrl, {
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: ICON_REQUEST_TIMEOUT_MS,
            maxContentLength: MAX_ICON_BYTES,
            ...getAgent(site),
        });

        const contentType = String(res.headers?.['content-type'] ?? '');
        if (!contentType.toLowerCase().includes('svg')) {
            Logger.debug(`Issue type icon ${iconUrl} is not an SVG (${contentType}), not caching`);
            return;
        }

        const body = new Uint8Array(res.data);
        if (body.byteLength > MAX_ICON_BYTES) {
            Logger.debug(`Issue type icon ${iconUrl} is too large (${body.byteLength} bytes), not caching`);
            return;
        }

        const dir = Uri.joinPath(Container.context.globalStorageUri, ICON_DIR);
        const name = `${createHash('sha256').update(iconUrl).digest('hex').slice(0, 16)}.svg`;
        const file = Uri.joinPath(dir, name);
        await workspace.fs.createDirectory(dir);
        await workspace.fs.writeFile(file, body);
        localUris.set(iconUrl, toRenderableUri(file));
    } catch (e) {
        Logger.debug(`Could not cache issue type icon ${iconUrl}: ${e}`);
    }
}

function collect(issues: ReadonlyArray<IconIssue>, found: Map<string, DetailedSiteInfo>): void {
    for (const issue of issues) {
        const iconUrl = issue.issuetype?.iconUrl;
        if (iconUrl && issue.siteDetails && !found.has(iconUrl) && needsLocalIconCopy(iconUrl, issue.siteDetails)) {
            found.set(iconUrl, issue.siteDetails);
        }
        if (issue.children?.length) {
            collect(issue.children, found);
        }
    }
}

export async function prefetchIssueTypeIcons(issues: ReadonlyArray<IconIssue>): Promise<void> {
    try {
        const found = new Map<string, DetailedSiteInfo>();
        collect(issues, found);

        const pending: Promise<void>[] = [];
        for (const [iconUrl, site] of found) {
            let work = downloads.get(iconUrl);
            if (!work) {
                work = download(iconUrl, site).then(() => {
                    // Allow a later prefetch to retry when no local copy was produced.
                    if (!localUris.has(iconUrl)) {
                        downloads.delete(iconUrl);
                    }
                });
                downloads.set(iconUrl, work);
            }
            pending.push(work);
        }
        await Promise.all(pending);
    } catch (e) {
        Logger.debug(`Issue type icon prefetch failed: ${e}`);
    }
}

export function _resetIssueTypeIconCacheForTests(): void {
    localUris.clear();
    downloads.clear();
}
