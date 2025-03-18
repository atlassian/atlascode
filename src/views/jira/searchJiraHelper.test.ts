import { SearchJiraHelper } from './searchJiraHelper';
import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import * as vscode from 'vscode';

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

jest.mock('@atlassianlabs/jira-pi-common-models');
jest.mock('../../analytics');
jest.mock('../../commands');
jest.mock('../../container');
jest.mock('../../atlclients/authInfo');
jest.mock('vscode');

const issue1 = forceCastTo<MinimalORIssueLink<DetailedSiteInfo>>({ key: 'ISSUE-1', summary: 'Test Issue' });
const issue2 = forceCastTo<MinimalORIssueLink<DetailedSiteInfo>>({ key: 'ISSUE-2', summary: 'Another Issue' });

describe('SearchJiraHelper', () => {
    beforeEach(() => {
        jest.spyOn(vscode.commands, 'registerCommand').mockImplementation();
        jest.spyOn(vscode.commands, 'executeCommand').mockImplementation();
        jest.spyOn(vscode.window, 'showQuickPick').mockImplementation();
    });

    afterEach(() => {
        SearchJiraHelper.clearIssues();
        jest.restoreAllMocks();
    });

    it('initialize should register the JiraSearchIssues command', () => {
        SearchJiraHelper.initialize();
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            'atlascode.jira.searchIssues',
            expect.any(Function),
        );
    });

    it('findIssue finds issues after setIssues', () => {
        SearchJiraHelper.setIssues([issue1, issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
        expect(SearchJiraHelper.findIssue('NONE-1')).toBeUndefined();
    });

    it('clearIssues clears all the issues', () => {
        SearchJiraHelper.setIssues([issue1, issue2], 'provider1');
        SearchJiraHelper.clearIssues();

        expect(SearchJiraHelper.findIssue(issue1.key)).toBeUndefined();
        expect(SearchJiraHelper.findIssue(issue2.key)).toBeUndefined();
    });

    it("setIssues replaces the provider's issues", () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.setIssues([issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBeUndefined();
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('setIssues stores different providers separately', () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.setIssues([issue2], 'provider2');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('appendIssues append issues for the same provider', () => {
        SearchJiraHelper.setIssues([issue1], 'provider1');
        SearchJiraHelper.appendIssues([issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });

    it('appendIssues works standalone', () => {
        SearchJiraHelper.appendIssues([issue1, issue2], 'provider1');

        expect(SearchJiraHelper.findIssue(issue1.key)).toBe(issue1);
        expect(SearchJiraHelper.findIssue(issue2.key)).toBe(issue2);
    });
});
