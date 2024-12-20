import { expect } from 'chai';
import { before, after, EditorView, Workbench, By, ActivityBar, SideBarView } from 'vscode-extension-tester';

describe('Auth User', async () => {
    let activityBar: ActivityBar;
    let sideBarView: SideBarView;

    before(async () => {
        // using a test user bot, login via an API
        // [Optional <ID:1>] Ideally, the test user already has some JIRAs assigned to them, If not, create a JIRA and assign it to the test user
        // use the tokens in the API to inject into the VSCode test extension
        await new EditorView().closeAllEditors();
        await new Workbench().executeCommand('Atlassian: Test Login');
        await new Promise((res) => {
            setTimeout(res, 2000);
        });

        activityBar = new ActivityBar();
        (await activityBar.getViewControl('Atlassian'))?.openView();
        sideBarView = new SideBarView();
        sideBarView.wait();

        // wait for 2 seconds so the sidebar can load
        await new Promise((res) => {
            setTimeout(res, 2000);
        });
    });

    after(async () => {});

    it('in SideBarView should not see log in button and should see My <Team> Issues', async () => {
        // test: given user is logged in, when they view the atlas drawer, they should not see a "please login to JIRA" button AND should see a "My <Team> Issues" section
        let atlasDrawer = sideBarView.findElement(By.id('workbench.view.extension.atlascode-drawer'));
        expect(atlasDrawer).to.not.be.undefined;

        const createIssueButton = atlasDrawer.findElement(By.css('[aria-label="Create issue..."]'));
        expect(createIssueButton).to.not.be.undefined;
        expect(await createIssueButton.getText()).to.equal('Create issue...');
    });

    it('in SideBarView should see a assigned JIRA issues', async () => {
        // [Optional <ID:1>]  test: given user is logged in, when they view the atlas drawer, they should see JIRA issues assigned to them
    });
});
