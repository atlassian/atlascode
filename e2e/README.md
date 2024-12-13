### What am I looking at?

This folder is for end-to-end ("e2e") tests and their configuration.

In `atlascode`, we use [vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester) to run browser automation-style tests agains ta developer instance of VSCode with the extension installed

How do these tests work?

-   `extester`, the executable from `vscode-extension-tester`, compiles and packages the extensions using `vsce`
-   A new instance of `vscode` is spun up, with `atlascode` and prerequisites installed
-   A special automation performs the actions we describe in test suites

What do these tests use?

-   `mocha` for orchestration
-   `chai` for assertions

Commands related to e2e tests:

    # Compile the tests in this folder into JS
    npm run e2e:compile

    # Build the extension, e2e tests, configure the test runner,
    # then run the E2E tests
    npm run e2e

    # Run the tests without rebuilding the extension
    # Use this one when iterating
    npm run e2e:rerun
