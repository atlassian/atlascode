import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { expansionCastTo } from 'testsutil';
import { Uri, workspace } from 'vscode';

import { getAxiosInstance } from '../../../jira/jira-client/providers';
import {
    _resetIssueTypeIconCacheForTests,
    issueTypeFallbackIcon,
    issueTypeIconUri,
    needsLocalIconCopy,
    prefetchIssueTypeIcons,
} from './issueTypeIconCache';

jest.mock('../../../container', () => ({
    Container: {
        context: { globalStorageUri: jest.requireMock('vscode').Uri.file('/storage') },
        clientManager: { jiraClient: jest.fn() },
    },
}));
jest.mock('../../../jira/jira-client/providers', () => ({
    getAxiosInstance: jest.fn(),
    getAgent: jest.fn(() => ({})),
}));
jest.mock('../../../logger', () => ({
    Logger: { debug: jest.fn(), error: jest.fn() },
}));

const site = expansionCastTo<DetailedSiteInfo>({
    host: 'example.atlassian.net',
    baseApiUrl: 'https://api.atlassian.com/ex/jira/abc/rest',
});
const AVATAR = 'https://example.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10761?size=medium';
const AVATAR_API =
    'https://api.atlassian.com/ex/jira/abc/rest/api/2/universal_avatar/view/type/issuetype/avatar/10761?size=medium';
const EPIC = 'https://example.atlassian.net/images/icons/issuetypes/epic.svg';
const SUBTASK = 'https://example.atlassian.net/images/icons/issuetypes/subtask.svg';
const svgBody = (size = 20) => new Uint8Array(size).buffer;

describe('issueTypeIconCache', () => {
    const container = jest.requireMock('../../../container').Container;
    const request = jest.fn();
    const createDirectory = jest.fn();
    const writeFile = jest.fn();
    const get = jest.fn();
    const authorizationProvider = jest.fn();

    beforeEach(() => {
        _resetIssueTypeIconCacheForTests();
        jest.clearAllMocks();
        request.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'image/svg+xml;charset=utf-8' } });
        createDirectory.mockResolvedValue(undefined);
        writeFile.mockResolvedValue(undefined);
        (getAxiosInstance as jest.Mock).mockReturnValue(request);
        get.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'image/png' } });
        authorizationProvider.mockResolvedValue('Bearer tok');
        container.clientManager.jiraClient.mockResolvedValue({
            transportFactory: () => ({ get }),
            authorizationProvider,
        });
        Object.defineProperty(workspace, 'fs', { value: { createDirectory, writeFile }, configurable: true });
    });

    describe('needsLocalIconCopy', () => {
        it.each([
            [EPIC, site, true],
            ['https://example.atlassian.net/images/icons/epic.SVG', site, true],
            [`${EPIC}?v=2`, site, true],
            ['https://EXAMPLE.atlassian.net:443/a/epic.svg', site, true],
            [AVATAR, site, true],
            [AVATAR_API, site, true],
            [
                'https://api.atlassian.com/ex/jira/other/rest/api/2/universal_avatar/view/type/issuetype/avatar/1',
                site,
                false,
            ],
            ['https://api.atlassian.com/ex/jira/abc/rest/api/2/issue/10001', site, false],
            ['https://api.atlassian.com/ex/jira/abc/images/icons/issuetypes/epic.svg', site, false],
            [AVATAR_API, expansionCastTo<DetailedSiteInfo>({ host: 'example.atlassian.net' }), false],
            ['https://other.example.com/rest/api/2/universal_avatar/view/type/issuetype/avatar/1', site, false],
            ['https://example.atlassian.net/rest/api/2/issue/10001', site, false],
            ['https://other.example.com/epic.svg', site, false],
            ['data:image/svg+xml;base64,AAAA', site, false],
            ['/images/epic.svg', site, false],
            ['not a url', site, false],
            [undefined, site, false],
            ['', site, false],
            [EPIC, undefined, false],
        ])('%s -> %s', (url, s, expected) => {
            expect(needsLocalIconCopy(url, s)).toBe(expected);
        });
    });

    it('fetches a gateway-hosted avatar with auth and serves the local copy', async () => {
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: AVATAR_API }, siteDetails: site }]);

        expect(request).not.toHaveBeenCalled();
        expect(authorizationProvider).toHaveBeenCalledWith('GET', AVATAR_API);
        expect(get).toHaveBeenCalledWith(AVATAR_API, expect.anything());
        const written = writeFile.mock.calls[0][0] as Uri;
        expect(written.path).toMatch(/\/storage\/issuetype-icons\/[0-9a-f]{16}\.png$/);
        expect(issueTypeIconUri(AVATAR_API, site).toString()).toBe(written.toString());
    });

    it('downloads a qualifying icon and serves the local file uri', async () => {
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        expect(request).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][1]).toMatchObject({ responseType: 'arraybuffer' });
        expect(createDirectory).toHaveBeenCalledTimes(1);
        const written = writeFile.mock.calls[0][0] as Uri;
        expect(written.path).toMatch(/\/storage\/issuetype-icons\/[0-9a-f]{16}\.svg$/);
        expect(issueTypeIconUri(EPIC, site).toString()).toBe(written.toString());
    });

    it('serves a file uri when storage uses the vscode-userdata scheme', async () => {
        const original = container.context.globalStorageUri;
        container.context.globalStorageUri = Uri.from({ scheme: 'vscode-userdata', path: '/storage' });
        try {
            await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

            const written = writeFile.mock.calls[0][0] as Uri;
            expect(written.scheme).toBe('vscode-userdata');
            const served = issueTypeIconUri(EPIC, site) as Uri;
            expect(served.scheme).toBe('file');
            expect(served.path).toBe(written.path);
        } finally {
            container.context.globalStorageUri = original;
        }
    });

    it('serves a file-scheme storage uri unchanged', async () => {
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        const written = writeFile.mock.calls[0][0] as Uri;
        expect(issueTypeIconUri(EPIC, site).toString()).toBe(written.toString());
        expect((issueTypeIconUri(EPIC, site) as Uri).scheme).toBe('file');
    });

    it('downloads a shared url once, including nested children', async () => {
        await prefetchIssueTypeIcons([
            {
                issuetype: { iconUrl: EPIC },
                siteDetails: site,
                children: [{ issuetype: { iconUrl: EPIC }, siteDetails: site }],
            },
        ]);
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        expect(request).toHaveBeenCalledTimes(1);
    });

    it('downloads distinct urls found in children', async () => {
        await prefetchIssueTypeIcons([
            {
                issuetype: { iconUrl: EPIC },
                siteDetails: site,
                children: [{ issuetype: { iconUrl: SUBTASK }, siteDetails: site }],
            },
        ]);

        expect(request).toHaveBeenCalledTimes(2);
    });

    it('skips non-qualifying urls', async () => {
        const url = 'https://example.atlassian.net/rest/api/2/issue/10001';
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: url }, siteDetails: site }]);

        expect(request).not.toHaveBeenCalled();
        expect(issueTypeIconUri(url, site).toString()).toBe(Uri.parse(url).toString());
    });

    it.each([
        ['HTTP failure', () => request.mockRejectedValue(new Error('boom'))],
        [
            'wrong content-type',
            () => request.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'text/html' } }),
        ],
        [
            'oversized body',
            () =>
                request.mockResolvedValue({
                    data: svgBody(100 * 1024 + 1),
                    headers: { 'content-type': 'image/svg+xml' },
                }),
        ],
    ])('falls back on %s without rejecting', async (_name, arrange) => {
        arrange();

        await expect(
            prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]),
        ).resolves.toBeUndefined();

        expect(writeFile).not.toHaveBeenCalled();
        expect(issueTypeIconUri(EPIC, site)).toEqual(issueTypeFallbackIcon());
    });

    it('retries a failed download only after a cooldown', async () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
        try {
            const issues = [{ issuetype: { iconUrl: EPIC }, siteDetails: site }];
            request.mockRejectedValueOnce(new Error('boom'));
            await prefetchIssueTypeIcons(issues);
            now.mockReturnValue(1_000_000 + 9 * 60 * 1000);
            await prefetchIssueTypeIcons(issues);
            expect(request).toHaveBeenCalledTimes(1);
            expect(issueTypeIconUri(EPIC, site)).toEqual(issueTypeFallbackIcon());

            now.mockReturnValue(1_000_000 + 11 * 60 * 1000);
            await prefetchIssueTypeIcons(issues);
            expect(request).toHaveBeenCalledTimes(2);
            expect((issueTypeIconUri(EPIC, site) as Uri).scheme).toBe('file');
        } finally {
            now.mockRestore();
        }
    });

    it('shares one request between concurrent prefetch calls', async () => {
        const issues = [{ issuetype: { iconUrl: EPIC }, siteDetails: site }];
        await Promise.all([prefetchIssueTypeIcons(issues), prefetchIssueTypeIcons(issues)]);

        expect(request).toHaveBeenCalledTimes(1);
    });

    it('requests icons with a timeout and a size limit', async () => {
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        expect(request).toHaveBeenCalledWith(
            EPIC,
            expect.objectContaining({ timeout: 5000, maxContentLength: 100 * 1024 }),
        );
    });

    describe('custom avatars', () => {
        const issues = [{ issuetype: { iconUrl: AVATAR }, siteDetails: site }];

        it('downloads through the authenticated client on the api base url', async () => {
            await prefetchIssueTypeIcons(issues);

            expect(request).not.toHaveBeenCalled();
            expect(authorizationProvider).toHaveBeenCalledWith('GET', AVATAR_API);
            expect(get).toHaveBeenCalledWith(
                AVATAR_API,
                expect.objectContaining({
                    headers: { Authorization: 'Bearer tok' },
                    responseType: 'arraybuffer',
                    timeout: 5000,
                    maxContentLength: 100 * 1024,
                }),
            );
            const written = writeFile.mock.calls[0][0] as Uri;
            expect(written.path).toMatch(/\/[0-9a-f]{16}\.png$/);
            expect(issueTypeIconUri(AVATAR, site).toString()).toBe(written.toString());
        });

        it('writes an svg file when the avatar is an svg', async () => {
            get.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'image/svg+xml' } });
            await prefetchIssueTypeIcons(issues);

            expect((writeFile.mock.calls[0][0] as Uri).path).toMatch(/\.svg$/);
        });

        it.each([
            ['missing', undefined],
            ['not ending in /rest', 'https://api.atlassian.com/ex/jira/abc'],
        ])('makes no request when baseApiUrl is %s', async (_n, baseApiUrl) => {
            const odd = expansionCastTo<DetailedSiteInfo>({ host: 'example.atlassian.net', baseApiUrl });
            await prefetchIssueTypeIcons([{ issuetype: { iconUrl: AVATAR }, siteDetails: odd }]);

            expect(get).not.toHaveBeenCalled();
            expect(issueTypeIconUri(AVATAR, site)).toEqual(issueTypeFallbackIcon());
        });

        it('falls back when the client cannot be created', async () => {
            container.clientManager.jiraClient.mockRejectedValue(new Error('no creds'));

            await expect(prefetchIssueTypeIcons(issues)).resolves.toBeUndefined();

            expect(request).not.toHaveBeenCalled();
            expect(writeFile).not.toHaveBeenCalled();
            expect(issueTypeIconUri(AVATAR, site)).toEqual(issueTypeFallbackIcon());
        });

        it('keeps a DC context path in the request url', async () => {
            const dc = expansionCastTo<DetailedSiteInfo>({
                host: 'jira.example.com',
                baseApiUrl: 'https://jira.example.com/jira/rest',
            });
            const url =
                'https://jira.example.com/jira/rest/api/2/universal_avatar/view/type/issuetype/avatar/1?size=medium';
            await prefetchIssueTypeIcons([{ issuetype: { iconUrl: url }, siteDetails: dc }]);

            expect(get).toHaveBeenCalledWith(url, expect.anything());
        });

        it.each(['%2f', '%2F', '%5c', '%5C', '%2e', '%2E'])('refuses avatar paths containing %s', async (enc) => {
            const url = `https://example.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/${enc}${enc}/x`;

            expect(needsLocalIconCopy(url, site)).toBe(false);
            await prefetchIssueTypeIcons([{ issuetype: { iconUrl: url }, siteDetails: site }]);
            expect(get).not.toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
        });

        it('rejects unsupported content types', async () => {
            get.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'image/jpeg' } });
            await prefetchIssueTypeIcons(issues);

            expect(get).toHaveBeenCalledTimes(1);
            expect(writeFile).not.toHaveBeenCalled();
        });
    });

    describe('issueTypeIconUri', () => {
        const fallback = (r: unknown) => expect(r).toEqual(issueTypeFallbackIcon());

        it('uses the issues codicon', () => {
            expect(issueTypeFallbackIcon()).toMatchObject({ id: 'issues' });
        });

        it.each([undefined, ''])('falls back to the codicon for url %p', (url) => {
            fallback(issueTypeIconUri(url, site));
        });

        it('falls back to the codicon for a qualifying url without a local copy', () => {
            fallback(issueTypeIconUri(EPIC, site));
            fallback(issueTypeIconUri(AVATAR, site));
        });

        it('returns the local file once cached', async () => {
            await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

            expect((issueTypeIconUri(EPIC, site) as Uri).scheme).toBe('file');
        });

        it('parses other urls unchanged', () => {
            const publicAvatar = 'https://example.atlassian.net/secure/viewavatar?avatarId=1';
            const otherHost = 'https://other.example.com/epic.svg';

            expect((issueTypeIconUri(publicAvatar, site) as Uri).toString()).toBe(Uri.parse(publicAvatar).toString());
            expect((issueTypeIconUri(otherHost, site) as Uri).toString()).toBe(Uri.parse(otherHost).toString());
            expect((issueTypeIconUri(EPIC, undefined) as Uri).toString()).toBe(Uri.parse(EPIC).toString());
        });
    });
});
