// import the webdriver and the high level browser wrapper
import { assert } from 'chai';
import { before, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { describe, it } from 'mocha';

// Let's make sure we can import something from the src folder if needed
import { AuthInfoVersionKey } from '../../src/constants';

// Create a Mocha suite
describe('My Test Suite', () => {
    let browser: VSBrowser;
    let driver: WebDriver;

    console.log('Oh look, a constant from src!');
    console.log('AuthInfoVersionKey:', AuthInfoVersionKey);

    // initialize the browser and webdriver
    before(async () => {
        browser = VSBrowser.instance;
        driver = browser.driver;
    });

    // test whatever we want using webdriver, here we are just checking the page title
    it('My Test Case', async () => {
        const title = await driver.getTitle();
        assert.isTrue(title === 'Getting Started' || title === 'Walkthrough: Setup VS Code');
    });
});
