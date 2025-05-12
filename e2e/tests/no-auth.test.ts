/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import { ActivityBar, after, before, By, EditorView, SideBarView, Workbench } from 'vscode-extension-tester';

describe('Atlassian Extension Activity Bar', async () => {
    let activityBar: ActivityBar;

    before(async () => {
        activityBar = new ActivityBar();
    });

    after(async () => {});

    it('should be installed', async () => {
        const controls = await activityBar.getViewControls();
        // Get title from every control
        const titles = await Promise.all(controls.map(async (control) => control.getTitle()));

        const atlassianTitle = titles.filter((title) => title.includes('Atlassian'));

        expect(atlassianTitle.length).to.be.greaterThan(0);
    });
});

describe('Atlassian Extension SideBar', async () => {
    let activityBar: ActivityBar;
    let sideBarView: SideBarView;
    const originalEnv = process.env;

    before(async () => {
        process.env = {
            ...originalEnv,
            ATLASCODE_FX3_TARGET_APP: 'some-app',
            ATLASCODE_FX3_API_KEY: 'some-key',
            ATLASCODE_FX3_ENVIRONMENT: 'Production',
            ATLASCODE_FX3_TIMEOUT: '2000',
        };
        activityBar = new ActivityBar();
        (await activityBar.getViewControl('Atlassian'))?.openView();
        sideBarView = new SideBarView();
        sideBarView.wait(10000);

        // wait for 2 seconds so the sidebar can load
        await new Promise((res) => {
            setTimeout(res, 2000);
        });

        await new Workbench().executeCommand('Atlassian: Test Logout');
    });

    after(async () => {
        process.env = originalEnv;
    });

    it('should have a login action suggestion', async () => {
        const atlasDrawer = sideBarView.findElement(By.id('workbench.view.extension.atlascode-drawer'));
        expect(atlasDrawer).to.not.be.undefined;

        // find element by aria-label: "Please login to Jira"
        const loginButton = atlasDrawer.findElement(By.css('[aria-label="/Please login to Jira"]'));
        expect(loginButton).to.not.be.undefined;
        expect(await loginButton.getText()).to.equal('Please login to Jira');
    });
});

describe('Atlassian Extension Settings Page', async () => {
    // let view: WebView;

    before(async () => {
        await new EditorView().closeAllEditors();
        await new Workbench().executeCommand('Atlassian: Open Settings');
        await new Promise((res) => {
            setTimeout(res, 6000);
        });
        // init the WebView page object
        // view = new WebView();
    });

    after(async () => {
        // after we are done with the webview, switch webdriver back to the vscode window
        // await view.switchBack();
        await new EditorView().closeAllEditors();
    });

    it('should have a title', async () => {
        // const title = await view.getTitle();
        // expect(title).to.equal('Atlassian Settings');
    });

    it('should have an Authentication Section', async () => {
        // can't write this test because selectors on webViews is broken
        // https://github.com/redhat-developer/vscode-extension-tester/issues/1492
        // Going to add our repro steps to the issue in hopes that this gets fixed
        // alternative: we could downgrade the version that we test.
        // No. because we should be testing on the latest version of VSCode
        // alternative: we could speed up the bug fix by contributing to the project
        // Perhaps, but we have other priorities first. Eg: testing the authenticated flows
        // alternative: we could do some kind of screenshot computer vision test
        // Maybe, but seems overkill for something that looks like its going to be fixed soon
    });
});
