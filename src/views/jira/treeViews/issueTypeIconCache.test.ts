import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { expansionCastTo } from 'testsutil';
import { Uri, workspace } from 'vscode';

import { getAxiosInstance } from '../../../jira/jira-client/providers';
import {
    _resetIssueTypeIconCacheForTests,
    issueTypeIconUri,
    needsLocalIconCopy,
    prefetchIssueTypeIcons,
} from './issueTypeIconCache';

jest.mock('../../../container', () => ({
    Container: {
        context: { globalStorageUri: jest.requireMock('vscode').Uri.file('/storage') },
    },
}));
jest.mock('../../../jira/jira-client/providers', () => ({
    getAxiosInstance: jest.fn(),
    getAgent: jest.fn(() => ({})),
}));
jest.mock('../../../logger', () => ({
    Logger: { debug: jest.fn(), error: jest.fn() },
}));

const site = expansionCastTo<DetailedSiteInfo>({ host: 'example.atlassian.net' });
const EPIC = 'https://example.atlassian.net/images/icons/issuetypes/epic.svg';
const SUBTASK = 'https://example.atlassian.net/images/icons/issuetypes/subtask.svg';
const svgBody = (size = 20) => new Uint8Array(size).buffer;

describe('issueTypeIconCache', () => {
    const request = jest.fn();
    const createDirectory = jest.fn();
    const writeFile = jest.fn();

    beforeEach(() => {
        _resetIssueTypeIconCacheForTests();
        jest.clearAllMocks();
        request.mockResolvedValue({ data: svgBody(), headers: { 'content-type': 'image/svg+xml;charset=utf-8' } });
        createDirectory.mockResolvedValue(undefined);
        writeFile.mockResolvedValue(undefined);
        (getAxiosInstance as jest.Mock).mockReturnValue(request);
        Object.defineProperty(workspace, 'fs', { value: { createDirectory, writeFile }, configurable: true });
    });

    describe('needsLocalIconCopy', () => {
        it.each([
            [EPIC, site, true],
            ['https://example.atlassian.net/images/icons/epic.SVG', site, true],
            [`${EPIC}?v=2`, site, true],
            ['https://EXAMPLE.atlassian.net:443/a/epic.svg', site, true],
            [
                'https://example.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/1?size=medium',
                site,
                false,
            ],
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

    it('downloads a qualifying icon and serves the local file uri', async () => {
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        expect(request).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][1]).toMatchObject({ responseType: 'arraybuffer' });
        expect(createDirectory).toHaveBeenCalledTimes(1);
        const written = writeFile.mock.calls[0][0] as Uri;
        expect(written.path).toMatch(/\/storage\/issuetype-icons\/[0-9a-f]{16}\.svg$/);
        expect(issueTypeIconUri(EPIC).toString()).toBe(written.toString());
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
        const url = 'https://example.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/1';
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: url }, siteDetails: site }]);

        expect(request).not.toHaveBeenCalled();
        expect(issueTypeIconUri(url).toString()).toBe(Uri.parse(url).toString());
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
        expect(issueTypeIconUri(EPIC).toString()).toBe(Uri.parse(EPIC).toString());
    });

    it('does not retry a failed download in the same session', async () => {
        request.mockRejectedValue(new Error('boom'));
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);
        await prefetchIssueTypeIcons([{ issuetype: { iconUrl: EPIC }, siteDetails: site }]);

        expect(request).toHaveBeenCalledTimes(1);
    });
});
