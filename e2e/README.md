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
    npm run test:e2e:compile

    # Build the extension, e2e tests, configure the test runner,
    # then run the E2E tests
    npm run test:e2e

    # Run the tests without rebuilding the extension
    # Use this one when iterating
    npm run test:e2e:rerun

### Running E2E Tests Headless

I'm sure we all love looking at the VSCode UI - but sometimes one might want to take a break from that, and run their tests in console only 😉 Unfortunately, [vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester) doesn't have built-in support for [headless](https://en.wikipedia.org/wiki/Headless_browser) execution.

However, we can work around that - by running our tests in Docker! We can mount our whole working directory, and run tests in [xvfb](https://en.wikipedia.org/wiki/Xvfb).

In this folder, there's a `Dockerfile` with a rather lightweight image - `vscode`, `xvfb`, their dependencies, and `npm`/`node` - and some scripts to run it. The intended usage is as follows:

* Build the docker image by running `npm run test:e2e:docker:build`. You only need to do it once
* Run one of the two commands:
    - `npm run test:e2e:docker` - this will do the full cycle of building the extension and setting up tests. You typically want to run this when you've just updated the extension
    - `npm run test:e2e:docker:rerun` - a much faster command to rerun the tests against an already prepared setup. Use this when iterating on tests themselves
