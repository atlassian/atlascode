import { expansionCastTo, resolvePromiseSync } from '../../../../testsutil';
import { JiraNotifier } from './jiraNotifier';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import * as showIssueCommand from '../../../commands/jira/showIssue';
import { window, commands } from 'vscode';

function createIssue(key: string, summary: string, siteId: string): MinimalIssue<DetailedSiteInfo> {
    return expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key,
        summary,
        siteDetails: expansionCastTo<DetailedSiteInfo>({ id: siteId }),
    });
}

jest.mock('../../../commands/jira/showIssue');

describe('JiraNotifier', () => {
    let showInformationMessageMock: jest.SpyInstance<Thenable<any>, any, any>;

    beforeEach(() => {
        showInformationMessageMock = jest.spyOn(window, 'showInformationMessage').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('ignoreAssignedIssues should not trigger a notification', () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1'), createIssue('ISSUE-2', 'Issue 2', 'site-1')];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.ignoreAssignedIssues(issues);

        expect(window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('notifyForNewAssignedIssues should trigger a notification', () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1'), createIssue('ISSUE-2', 'Issue 2', 'site-1')];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalled();
    });

    it('notifyForNewAssignedIssues should not notify for already known issues', () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1'), createIssue('ISSUE-2', 'Issue 2', 'site-1')];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.ignoreAssignedIssues(issues);
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('notifyForNewAssignedIssues should not notify twice for the same issue', () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1'), createIssue('ISSUE-2', 'Issue 2', 'site-1')];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalledTimes(1);

        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle a single new issue correctly', () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1')];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalledWith('[ISSUE-1] "Issue 1" assigned to you', 'Open Issue');
    });

    it('should handle multiple new issues correctly', () => {
        const issues = [
            createIssue('ISSUE-1', 'Issue 1', 'site-1'),
            createIssue('ISSUE-2', 'Issue 2', 'site-1'),
            createIssue('ISSUE-3', 'Issue 3', 'site-1'),
        ];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalledWith(
            '[ISSUE-1] "Issue 1", [ISSUE-2] "Issue 2" and [ISSUE-3] "Issue 3" assigned to you',
            'View Atlassian Explorer',
        );
    });

    it('should handle more than three new issues correctly', () => {
        const issues = [
            createIssue('ISSUE-1', 'Issue 1', 'site-1'),
            createIssue('ISSUE-2', 'Issue 2', 'site-1'),
            createIssue('ISSUE-3', 'Issue 3', 'site-1'),
            createIssue('ISSUE-4', 'Issue 4', 'site-1'),
        ];

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(window.showInformationMessage).toHaveBeenCalledWith(
            '[ISSUE-1] "Issue 1", [ISSUE-2] "Issue 2" and 2 other new issues assigned to you',
            'View Atlassian Explorer',
        );
    });

    it('notification should open a single issue when "Open Issue" is selected', async () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1')];

        showInformationMessageMock.mockReturnValue(resolvePromiseSync('something'));

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(showIssueCommand.showIssue).toHaveBeenCalledWith(issues[0]);
        expect(commands.executeCommand).not.toHaveBeenCalled();
    });

    it('notification should open the Atlassian Explorer when "View Atlassian Explorer" is selected', async () => {
        const issues = [createIssue('ISSUE-1', 'Issue 1', 'site-1'), createIssue('ISSUE-2', 'Issue 2', 'site-1')];

        showInformationMessageMock.mockReturnValue(resolvePromiseSync('something'));

        const jiraNotifier = new JiraNotifier();
        jiraNotifier.notifyForNewAssignedIssues(issues);

        expect(showIssueCommand.showIssue).not.toHaveBeenCalled();
        expect(commands.executeCommand).toHaveBeenCalledWith('workbench.view.extension.atlascode-drawer');
    });
});
