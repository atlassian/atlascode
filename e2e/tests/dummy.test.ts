// import the webdriver and the high level browser wrapper
import { expect } from 'chai';
import { before, VSBrowser, WebDriver, ActivityBar, after } from 'vscode-extension-tester';
import { describe, it } from 'mocha';

// Let's make sure we can import something from the src folder if needed
import { AuthInfoVersionKey } from '../../src/constants';

// Create a Mocha suite
describe('Atlassian Extension', async () => {
    let browser: VSBrowser;
    let driver: WebDriver;

    console.log('Oh look, a constant from src!');
    console.log('AuthInfoVersionKey:', AuthInfoVersionKey);

    const { log, debug, info, warn } = console;
    // initialize the browser and webdriver
    before(async () => {
        // Mocking console.log
        global.console = {
            ...console,
            log: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
        };

        browser = VSBrowser.instance;
        driver = browser.driver;
    });

    after(async () => {
        // reset global.console
        global.console = {
            ...console,
            log,
            debug,
            info,
            warn,
        };
    });

    // test whatever we want using webdriver, here we are just checking the page title
    it('My Test Case', async () => {
        const title = await driver.getTitle();
        expect(title).to.be.oneOf([
            'Getting Started',
            'Walkthrough: Setup VS Code',
            'Getting Started - Visual Studio Code',
        ]);
    });

    it('should be installed', async () => {
        const activityBar = new ActivityBar();
        const controls = await activityBar.getViewControls();
        // Get title from every control
        const titles = await Promise.all(controls.map(async (control) => control.getTitle()));

        expect('Atlassian').to.be.oneOf(titles);
    });
});
