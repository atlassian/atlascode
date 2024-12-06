# Atlassian for VS Code

Atlassian for VS Code brings the functionality of Atlassian products to your favorite IDE!

This extension combines the power of Jira and Bitbucket to streamline the developer workflow within VS Code.

With Atlassian for VS Code you can create and view issues, start work on issues, create pull requests, do code reviews, start builds, get build statuses and more!

**Note:** 'Atlassian for VS Code' is published as an Atlassian Labs project.
Although you may find unique and highly useful functionality in the Atlassian Labs apps, Atlassian takes no responsibility for your use of these apps.

## Getting Started

-   Make sure you have VS Code version 1.40.0 or above
-   Download the extension from the marketplace
-   Authenticate with Jira and/or Bitbucket from the 'Atlassian: Open Settings' page available in the command palette
-   From the command palette, type 'Atlassian:' to see all of the extensions available commands

For more information, see [Getting started with VS Code](https://confluence.atlassian.com/display/BITBUCKET/Getting+started+with+VS+Code) and the related content.

**Note:** Jira Service Desk projects are not fully supported at this time.

## Features at a Glance

Here's a quick peek at a developer's workflow:

![dev workflow](https://raw.githubusercontent.com/atlassian/atlascode/main/.readme/dev-workflow.gif)

Reviewing with Bitbucket pull request features is a snap:

![review pr](https://raw.githubusercontent.com/atlassian/atlascode/main/.readme/review-pr.gif)

Got a burning issue you'd like to work on?

![start work](https://raw.githubusercontent.com/atlassian/atlascode/main/.readme/issue-start-work.gif)

Kick off your builds:

![builds](https://raw.githubusercontent.com/atlassian/atlascode/main/.readme/start-pipeline.gif)

Create that issue without breaking your stride:

![issue from todo](https://raw.githubusercontent.com/atlassian/atlascode/main/.readme/create-from-code-lens.gif)

...and lots more

## Everyone Has Issues...

Please refer to [our issue tracker for known issues](https://github.com/atlassian/atlascode/issues) and please contribute if you encounter an issue yourself.

**Note for Server/Data Center users:** The extension supports Jira and Bitbucket versions released in the last two years, per our [end of life policy](https://confluence.atlassian.com/x/ewAID).
You can find your instance's version in the footer of any Jira/Bitbucket page.

### Questions? Comments? Kudos?

Please use the in-app feedback form to tell us what you think! It's available from the 'Atlassian: Open Settings' and 'Atlassian: Open Welcome' pages available in the command palette.

## Contributors

Pull requests, issues and comments welcome.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

Running and debugging the extension:

-   Atlassian for VS Code is a node project, as such you'll need to run `npm install` before building.
-   To debug the extension from within VS Code you'll need a `launch.json`.
    ** An example `launch.json` that will be suitable for most users is included as `.vscode/launch.json.example`.
    ** To use the example file simply copy it to `launch.json`.
-   Once you have a `launch.json` file select "Debug and Run" from the Activity Bar and click "Start Debugging".
    \*\* After the extension builds VS Code will launch a new instance of itself (the Extension Development Host) running the extension.
-   When you want to test your code changes
    ** If the extension development host is still running restart by clicking âŸ² in the debug toolbar.
    ** If you've already stopped the host just start debugging again.

For pull requests:

-   Follow the existing style
-   Separate unrelated changes into multiple pull requests
-   Pull requests should target the `external-contributions` branch

Atlassian requires contributors to sign a Contributor License Agreement,
known as a CLA. This serves as a record stating that the contributor is
entitled to contribute the code/documentation/translation to the project
and is willing to have it used in distributions and derivative works
(or is willing to transfer ownership).

Prior to accepting your contributions we ask that you please follow the appropriate
link below to digitally sign the CLA. The Corporate CLA is for those who are
contributing as a member of an organization and the individual CLA is for
those contributing as an individual.

-   [CLA for corporate contributors](https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=e1c17c66-ca4d-4aab-a953-2c231af4a20b)
-   [CLA for individuals](https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=3f94fbdc-2fbe-46ac-b14c-5d152700ae5d)

