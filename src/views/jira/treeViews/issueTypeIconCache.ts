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

// VS Code blocks http(s) .svg resources and cannot authenticate avatar requests, so such icons are copied locally.
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

type IconKind = 'builtin' | 'avatar';

function iconKind(iconUrl: string | undefined, site: { host: string } | undefined): IconKind | undefined {
    if (!iconUrl || !site?.host) {
        return undefined;
    }
    try {
        const url = new URL(iconUrl);
        if (
            (url.protocol !== 'https:' && url.protocol !== 'http:') ||
            url.hostname.toLowerCase() !== stripPort(site.host)
        ) {
            return undefined;
        }
        const path = url.pathname.toLowerCase();
        if (path.endsWith('.svg')) {
            return 'builtin';
        }
        return path.includes('/rest/api/') && path.includes('/universal_avatar/') ? 'avatar' : undefined;
    } catch {
        return undefined;
    }
}

export function needsLocalIconCopy(iconUrl: string | undefined, site: { host: string } | undefined): boolean {
    return iconKind(iconUrl, site) !== undefined;
}

// Custom avatars need credentials, and OAuth tokens only work on the site's API base, so the request is moved there.
function toApiUrl(iconUrl: string, site: DetailedSiteInfo): string | undefined {
    const base = site.baseApiUrl;
    if (!base?.endsWith('/rest')) {
        return undefined;
    }
    const url = new URL(iconUrl);
    const restIndex = url.pathname.toLowerCase().indexOf('/rest/api/');
    return restIndex < 0 ? undefined : `${base}${url.pathname.slice(restIndex + '/rest'.length)}${url.search}`;
}

export function issueTypeIconUri(iconUrl: string): Uri {
    return localUris.get(iconUrl) ?? Uri.parse(iconUrl);
}

// The workbench CSP rejects the vscode-userdata scheme for images; the same path as a file: Uri is allowed.
function toRenderableUri(target: Uri): Uri {
    return target.scheme === 'vscode-userdata' ? Uri.file(target.fsPath) : target;
}

async function fetchIcon(iconUrl: string, site: DetailedSiteInfo, kind: IconKind) {
    const options = {
        method: 'GET' as const,
        responseType: 'arraybuffer' as const,
        timeout: ICON_REQUEST_TIMEOUT_MS,
        maxContentLength: MAX_ICON_BYTES,
    };
    if (kind === 'builtin') {
        return getAxiosInstance()(iconUrl, { ...options, ...getAgent(site) });
    }
    const url = toApiUrl(iconUrl, site);
    if (!url) {
        return undefined;
    }
    const client = await Container.clientManager.jiraClient(site);
    return client.transportFactory().get(url, {
        ...options,
        headers: { Authorization: await client.authorizationProvider('GET', url) },
        ...getAgent(site),
    });
}

async function download(iconUrl: string, site: DetailedSiteInfo, kind: IconKind): Promise<void> {
    try {
        const res = await fetchIcon(iconUrl, site, kind);
        if (!res) {
            Logger.debug(`Issue type icon ${iconUrl} has no usable API url, not caching`);
            return;
        }

        const contentType = String(res.headers?.['content-type'] ?? '').toLowerCase();
        const extension = contentType.includes('svg') ? 'svg' : contentType.includes('image/png') ? 'png' : undefined;
        if (!extension) {
            Logger.debug(`Issue type icon ${iconUrl} is not an SVG or PNG (${contentType}), not caching`);
            return;
        }

        const body = new Uint8Array(res.data);
        if (body.byteLength > MAX_ICON_BYTES) {
            Logger.debug(`Issue type icon ${iconUrl} is too large (${body.byteLength} bytes), not caching`);
            return;
        }

        const dir = Uri.joinPath(Container.context.globalStorageUri, ICON_DIR);
        const name = `${createHash('sha256').update(iconUrl).digest('hex').slice(0, 16)}.${extension}`;
        const file = Uri.joinPath(dir, name);
        await workspace.fs.createDirectory(dir);
        await workspace.fs.writeFile(file, body);
        localUris.set(iconUrl, toRenderableUri(file));
    } catch (e) {
        Logger.debug(`Could not cache issue type icon ${iconUrl}: ${e}`);
    }
}

interface IconTarget {
    site: DetailedSiteInfo;
    kind: IconKind;
}

function collect(issues: ReadonlyArray<IconIssue>, found: Map<string, IconTarget>): void {
    for (const issue of issues) {
        const iconUrl = issue.issuetype?.iconUrl;
        const kind = iconUrl && !found.has(iconUrl) ? iconKind(iconUrl, issue.siteDetails) : undefined;
        if (iconUrl && issue.siteDetails && kind) {
            found.set(iconUrl, { site: issue.siteDetails, kind });
        }
        if (issue.children?.length) {
            collect(issue.children, found);
        }
    }
}

export async function prefetchIssueTypeIcons(issues: ReadonlyArray<IconIssue>): Promise<void> {
    try {
        const found = new Map<string, IconTarget>();
        collect(issues, found);

        const pending: Promise<void>[] = [];
        for (const [iconUrl, { site, kind }] of found) {
            let work = downloads.get(iconUrl);
            if (!work) {
                work = download(iconUrl, site, kind).then(() => {
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
