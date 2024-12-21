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

    it('in SideBarView should see Create issue... button', async () => {
        let atlasDrawer = sideBarView.findElement(By.id('workbench.view.extension.atlascode-drawer'));
        expect(atlasDrawer).to.not.be.undefined;

        const createIssueButton = atlasDrawer.findElement(By.css('[aria-label="Create issue..."]'));
        expect(createIssueButton).to.not.be.undefined;
        expect(await createIssueButton.getText()).to.equal('Create issue...');
    });

    it('in SideBarView should see a assigned JIRA issues', async () => {});
});
