/* eslint-disable no-unused-expressions */
import { ActivityBar, after, before, EditorView, SideBarView, Workbench } from 'vscode-extension-tester';

describe('Auth User', async () => {
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

    after(async () => {
        process.env = originalEnv;
    });

    it('in SideBarView should see a assigned JIRA issues', async () => {});
});
