let assert;
// import the webdriver and the high level browser wrapper
// import { before, VSBrowser, WebDriver } from "vscode-extension-tester";
const before = require("vscode-extension-tester").before;
const VSBrowser = require("vscode-extension-tester").VSBrowser;
const WebDriver = require("vscode-extension-tester").WebDriver;

// Create a Mocha suite
describe("My Test Suite", () => {
  let browser;
  let driver;

  // initialize the browser and webdriver
  before(async () => {
    assert = (await import("chai")).assert;
    browser = VSBrowser.instance;
    driver = browser.driver;
  });

  // test whatever we want using webdriver, here we are just checking the page title
  it("My Test Case", async () => {
    const title = await driver.getTitle();

    // reduces flakiness due to two files being opened
    assert.isTrue(title === "Getting Started" || title === "Walkthrough: Setup VS Code");
  });
});