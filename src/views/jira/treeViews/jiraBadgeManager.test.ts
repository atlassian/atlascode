import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { TreeView, Uri } from 'vscode';

import { expansionCastTo } from '../../../../testsutil';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { JiraBadgeManager } from './jiraBadgeManager';

jest.mock('./utils', () => ({
    getJiraIssueUri: (issue: MinimalIssue<DetailedSiteInfo>) => JiraUriMocker.get(issue),
}));

abstract class JiraUriMocker {
    private static cache: Uri[] = [];
    private static counter = 100;

    public static get(issue: MinimalIssue<DetailedSiteInfo>): Uri {
        const uri = Uri.parse(`jira:issue/${issue.key}`);
        this.cache.push(uri);
        return uri;
    }

    public static create(): Uri {
        const uri = Uri.parse(`jira:issue/AXON-${this.counter++}`);
        this.cache.push(uri);
        return uri;
    }

    public static flush(): Uri[] {
        const c = this.cache;
        this.cache = [];
        return c;
    }
}

describe('JiraBadgeManager', () => {
    let treeViewMock: TreeView<any> = undefined!;

    beforeAll(() => {
        treeViewMock = expansionCastTo<TreeView<any>>({});
        JiraBadgeManager.initialize(treeViewMock);
    });

    afterEach(() => {
        JiraUriMocker.flush().forEach((uri) => JiraBadgeManager.getInstance().clearBadgeForUri(uri));
        treeViewMock.badge = undefined;
        jest.clearAllMocks();
    });

    it('should retrieve JiraBadgeManager singleton', () => {
        expect(JiraBadgeManager.getInstance()).toBeDefined();
    });

    it('should throw an error if initialized more than once', () => {
        expect(() => JiraBadgeManager.initialize(expansionCastTo<TreeView<any>>({}))).toThrow(
            'An instance of JiraBadgeManager already exists.',
        );
    });

    it('should provide file decoration for a registered URI', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const uri = JiraUriMocker.create();
        jiraBadgeManager.notificationSent(uri);

        const decoration = jiraBadgeManager.provideFileDecoration(uri, {} as any);
        expect(decoration).toEqual({
            badge: '1️⃣',
            tooltip: '1 notifications',
            color: expect.any(Object),
            propagate: false,
        });
    });

    it('should return undefined for an unregistered URI', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const uri = JiraUriMocker.create();
        const decoration = jiraBadgeManager.provideFileDecoration(uri, {} as any);
        expect(decoration).toBeUndefined();
    });

    it('should increase badge count and update treeview badge', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const uri1 = JiraUriMocker.create();
        jiraBadgeManager.notificationSent(uri1);

        expect(treeViewMock.badge).toEqual({
            value: 1,
            tooltip: 'xxx',
        });

        const uri2 = JiraUriMocker.create();
        jiraBadgeManager.notificationSent(uri2);

        expect(treeViewMock.badge).toEqual({
            value: 2,
            tooltip: 'xxx',
        });
    });

    it('should clear badge for a URI and clear the treeview badge', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const uri = JiraUriMocker.create();
        jiraBadgeManager.notificationSent(uri);
        jiraBadgeManager.clearBadgeForUri(uri);

        expect(treeViewMock.badge).toBeUndefined();
    });

    it('should handle notifications for issues', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const issue = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
            key: 'TEST-1',
            siteDetails: {} as DetailedSiteInfo,
        });

        jest.spyOn(jiraBadgeManager, 'notificationSent');

        jiraBadgeManager.notificationSentForIssue(issue);

        expect(jiraBadgeManager.notificationSent).toHaveBeenCalled();

        const expectedUri = Uri.parse('jira:issue/TEST-1');
        const actualUri = (jiraBadgeManager.notificationSent as jest.Mock).mock.lastCall![0];
        expect(actualUri.toString()).toEqual(expectedUri.toString());
    });

    it('should clear badge for issues', () => {
        const jiraBadgeManager = JiraBadgeManager.getInstance();

        const issue = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
            key: 'TEST-2',
            siteDetails: {} as DetailedSiteInfo,
        });
        const uri = Uri.parse('jira:issue/TEST-2');

        jiraBadgeManager.notificationSent(uri);
        jiraBadgeManager.clearBadgeForIssue(issue);

        expect(treeViewMock.badge).toBeUndefined();
    });
});
