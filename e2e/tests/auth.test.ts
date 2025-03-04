/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import { before, after, EditorView, Workbench, By, ActivityBar, SideBarView } from 'vscode-extension-tester';

describe('Auth User', async () => {
    let activityBar: ActivityBar;
    let sideBarView: SideBarView;

    before(async () => {
        await new EditorView().closeAllEditors();
        await new Workbench().executeCommand('Atlassian: Test Login');
        await new Promise((res) => {
            setTimeout(res, 2000);
        });

        activityBar = new ActivityBar();
        (await activityBar.getViewControl('Atlassian'))?.openView();
        sideBarView = new SideBarView();
        sideBarView.wait(10000);

        // wait for X seconds so the sidebar can load
        await new Promise((res) => {
            setTimeout(res, 6000);
        });
    });

    after(async () => {});

    it('in Custom JQL  Filters SideBarView should see Configure JQL entries in settings to view Jira issues button', async () => {
        const atlasDrawer = sideBarView.findElement(By.id('workbench.view.extension.atlascode-drawer'));
        expect(atlasDrawer).to.not.be.undefined;

        const createIssueButton = atlasDrawer.findElement(
            By.css('[aria-label="Configure JQL entries in settings to view Jira issues"]'),
        );
        expect(createIssueButton).to.not.be.undefined;
        expect(await createIssueButton.getText()).to.equal('Configure JQL entries in settings to view Jira issues');
    });

    it('in SideBarView should see a assigned JIRA issues', async () => {});
});
