# Atlassian for VS Code

[![Atlassian license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

Stay in the flow by using Atlassian for VSCode to start work on a JIRA issue, raise and review PRs, and close out work! All directly from the IDE.


[**Download now**](https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode&ssr=false#overview)


## Usage


### Getting Started

-   Make sure you have VS Code version 1.40.0 or above
-   Download the extension from the marketplace
-   Authenticate with Jira and/or Bitbucket from the 'Atlassian: Open Settings' page available in the command palette
-   From the command palette, type 'Atlassian:' to see all of the extensions available commands

For more information, see [Getting started with VS Code](https://confluence.atlassian.com/display/BITBUCKET/Getting+started+with+VS+Code) and the related content.

**Note:** Jira Service Desk projects are not fully supported at this time.

### Features at a Glance

Here's a quick peek at a developer's workflow:

![dev workflow](https://bitbucket.org/atlassianlabs/atlascode/raw/main/.readme/dev-workflow.gif)

Reviewing with Bitbucket pull request features is a snap:

![review pr](https://bitbucket.org/atlassianlabs/atlascode/raw/main/.readme/review-pr.gif)

Got a burning issue you'd like to work on?

![start work](https://bitbucket.org/atlassianlabs/atlascode/raw/main/.readme/issue-start-work.gif)

Kick off your builds:

![builds](https://bitbucket.org/atlassianlabs/atlascode/raw/main/.readme/start-pipeline.gif)

Create that issue without breaking your stride:

![issue from todo](https://bitbucket.org/atlassianlabs/atlascode/raw/main/.readme/create-from-code-lens.gif)

...and lots more


## Feedback

Please use the in-app feedback form to tell us what you think! It's available from the 'Atlassian: Open Settings' and 'Atlassian: Open Welcome' pages available in the command palette.

## Installation

Running and debugging the extension:

-   Atlassian for VS Code is a node project, as such you'll need to run `npm install` before building.
-   To debug the extension from within VS Code you'll need a `launch.json`.
    ** An example `launch.json` that will be suitable for most users is included as `.vscode/launch.json.example`.
    ** To use the example file simply copy it to `launch.json`.
-   Once you have a `launch.json` file select "Debug and Run" from the Activity Bar and click "Start Debugging".
    \*\* After the extension builds VS Code will launch a new instance of itself (the Extension Development Host) running the extension.
-   When you want to test your code changes
    ** If the extension development host is still running restart by clicking ⟲ in the debug toolbar.
    ** If you've already stopped the host just start debugging again.



## Documentation

### Feature Flags

This package uses FX3 - Atlassian's internal solution for running experiments and rolling out features. Using it requires an API key, which is not included in code as a matter of policy.

If you are an Atlassian dev reading this - please look up the `atlascode` section [here](https://developer.atlassian.com/platform/frontend-feature-flags/resources/api-keys/), copy the value for the appropriate environment into `.env`, and rebuild the project.

If you are an external contributor - please feel free to ignore the feature gate client initialization failure, the default configuration of the extension will work without it, as if all feature gated content were disabled.

### Remote Debugging

For some tasks, it's important to be able to emulate [remote execution](https://code.visualstudio.com/docs/remote/remote-overview) of the VS Code - e.g. to reproduce or debug the behavior users observe when working in browser-based tools like Github Codespaces, or Salesforce Code Builder.

VSCode provides some very helpful [documentation](https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-extensions) on how to test and debug extensions for that environment. In short, one would need to set up Dev Containers execution as described [here](https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-in-a-custom-development-container).

To run `atlascode` in such a way, please follow the VSCode documentation:

-   Install [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VSCode Extension
-   Run `npm install` like you normally would
-   In VSCode, choose `Dev Containers: Rebuild and Reopen in Container` from the command pallette
-   Wait for the VSCode to re-open in the container evnironment - you'll be able to see the difference in the header/search bar
-   Proceed to run or debug the extension as usual - it will now be running as it would in remote execution

The configuration for the Dev Container is located in [./.devcontainer/devcontainer.json](https://bitbucket.org/atlassianlabs/atlascode/src/main/.devcontainer/devcontainer.json).

Note: for advanced use-cases, it is possible to run scripts in dev containers via [@devcontainers/cli](https://github.com/devcontainers/cli) - try `npx devcontainer --help`



## Tests

```
npm run test
```

## Contributions

Contributions to Atlassian for VS Code are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details. 

# Issues 

We moved from Bitbucket to Github. 

To open a new issues, please see Github 

To see old issues, please first look at Github then at [Bitbucket](https://bitbucket.org/atlassianlabs/atlascode/issues)

**Note for Server/Data Center users:** The extension supports Jira and Bitbucket versions released in the last two years, per our [end of life policy](https://confluence.atlassian.com/x/ewAID).
You can find your instance's version in the footer of any Jira/Bitbucket page.

## License

See [LICENSE](LICENSE) file

<br/> 

[![With thanks from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks-light.png)](https://www.atlassian.com)
