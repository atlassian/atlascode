### [Report an Issue](https://github.com/atlassian/atlascode/issues)

## What's new in 4.0.20

### Features

- Added Draft pull requests
- Rovo Dev: Added "Restart Process" button to error dialogs when the Rovo Dev process terminates unexpectedly

### Improvements

- Added warning message when no git repository selected on Start Work page
- Bumped Rovo Dev version to v0.13.47
- Added ADF ↔ WikiMarkup conversion for Jira Data Center: transform description and comments to/from WikiMarkup so DC (string-based API) and Cloud (ADF) both work correctly

### Bug Fixes

- Jira Data Center: fixed errors when adding or updating comments (comment body is now sent as string for DC, ADF for Cloud)
- Jira DC: fixed updating issue description (description is sent as WikiMarkup string for DC, ADF for Cloud)
- Jira DC: user mentions in comments and description now show the correct username instead of @unknown

## What's new in 4.0.19

### Improvements

- Onboarding panel enables/disables Jira and Bitbucket based on user selections
- URI handler for Rovo Dev - vscode://atlassian.atlascode/rovoDev will bring the user directly to Rovo Dev part of the extension
- Added "Enable Rovo Dev" command and URI handler support for programmatically enabling Rovo Dev

### Bug Fixes

- Fixed Stop button not appearing when executing Deep Plan

## What's new in 4.0.18

### Bug Fixes

- Fixed Rovo Dev forgetting previous Yolo mode setting
- Fixed worklog creation error for users in UTC timezone

## What's new in 4.0.17

- Internal changes

## What's new in 4.0.16

### Features

- Rovo Dev sessions management: restore a previous session, fork session, delete session

### Improvements

- Updated Rovo Dev to v0.13.27

### Bug Fixes

- Added missing labels for PR merge strategies(AXON-1733)
- Fixed authentication error
- Fixed user mentions not working in Jira issue comments when using editor
- Fixed settings write failures blocking issue creation and site removal
- Fixed dismiss button handling for 'Credentials refused...' popup
- Added more meaningful error message in case of expired access token usage

## What's new in 4.0.14

### Features

- **Share Issue Feature**: Added ability to share Jira issues (AXON-1695)
- **Cascading Field Support**: Added support for cascading value types in Jira fields (AXON-326)
- **Missing Scopes Banner**: Added new banner notification for missing authentication scopes (AXON-1678)

### Improvements

- **Rovo Dev Updates**:
    - Updated Rovo Dev to v0.13.22
    - Improved keyboard navigation for context and preference buttons (AXON-1697)
    - Made Rovo Dev interface responsive with better width properties and aligned settings actions
    - Left-aligned CTA buttons for better UI consistency (AXON-1291)
    - Run Rovo Dev as a subprocess instead of in terminal for better performance (AXON-1643)
    - Improved analytics tracking and refactored analytics implementation (AXON-1545, AXON-1670)
    - Fixed text styling for user messages
    - Minor CSS improvements

- **Build Process**: Skip nightly builds when there are no new commits to improve efficiency (AXON-1129)
- **Default Commit Messages**: Added support for default commit messages (commit #1448)
- **Streamlined Configuration**: Improved launch configuration setup

### Bug Fixes

- **Pull Request Issues**: Fixed error while fetching latest pull requests (AXON-1651)
- **JQL Execution**: Fixed "failed to execute JQL" error (AXON-1653)
- **Branch Creation**: Fixed branch creation errors in Start Work page (AXON-1707)
- **Authentication**: Prevented duplicate authentication notifications (AXON-727, AXON-449)
- **Telemetry**: Removed noisy "Error getting URL" telemetry logging from HTTP client (AXON-1650)
- **Security**: Fixed querystring vulnerability (CVE fix)
- **Rovo Dev Messages**: Properly handle and ignore request-usage messages from Rovo Dev

## What's new in 4.0.13

- Internal changes

## What's new in 4.0.12

### Improvements

- Added support for Rovo Dev /usage and /prompts commands
- Add saving of last chosen issue type

### Bug Fixes

- Fixed validation for required checkbox fields on issue creation

## What's new in 4.0.10

### Features

- Added development field support
- Added Branch creation and Rovo Dev actions in Create Issue Page
- Added filter by project support

## What's new in 4.0.9

### Features

- Added filter by assignee support

## What's new in 4.0.8

### Features

- Added activity history support

### Bug Fixes

- Fixed issue with project loading in Jira Cloud Create Issue Screen

## What's new in 4.0.7

### Features

- Added edit and delete work log support
- Added Call-to-Action links for Rovo Dev enablement errors and credit limit errors

### Bug Fixes

- Fix issue with not working team adding functionality
- Disabled CMD+B hotkey when Jira/Bitbucket editor has focus

## What's new in 4.0.6

### Features

- Added clone jira work items support

### Improvements

- Added validation checks to ensure the Jira API Token hasn't expired
- Rovo Dev now doesn't start, and prompts for fixing the API Token authentication, when the API Token is expired

### Bug Fixes

- Fix executable not found for Rovo Dev on Windows
- Fix some of the exit code 1 reason 2 failures of Rovo Dev on Windows
- Fixed UI flickering of Jira suggestions in Rovo Dev

## What's new in 4.0.5

### Features

- Added drag and drop support into the Rovo Dev view for prompt context (requires pressing the `shift` key to drop)
- Added native support for Jira work items for Rovo Dev prompt context

## What's new in 4.0.4

### Improvements

- Added support for Rovo Dev /status command

### Bug Fixes

- Fixed duplicated slash commands in Rovo Dev's prompt box
- Fixed broken entitlement check disabled view in 4.0.3

## What's new in 4.0.3

### Improvements

- Improved the initialization time for Rovo Dev, allowing the process to start before its webview is ready
- Added assignee column for child and linked issues

### Bug Fixes

- Fixed issue with infinite loading when searching labels

## What's new in 4.0.2

### Improvements

- Removed the hint on code selection to send the text to Rovo Dev

## What's new in 4.0.1

### Features

- Added a config option to enable/disable the Rovo Dev feature

## What's new in 4.0.0

### Features

- **Rovo Dev: Atlassian AI Agent** is now available in beta
    - New sidebar icon that opens the Rovo Dev view. Rovo Dev can answer questions about your codebase and complete tasks for you
    - Read our docs here: https://github.com/atlassian/atlascode/wiki

### Bug Fixes

- Fix issue when logging out from api token does not restore the corresponding oauth site

## What's new in 3.8.20

- Internal changes only.

## What's new in 3.8.19

### Bug Fixes

- Fix error while connecting several jira sites with an API token
- Fix issue when pressing enter to submit the form does not work

## What's new in 3.8.18

- Internal changes only.

## What's new in 3.8.17

### Features

- Update pipeline schema to the current latest version
- Add the ability to search issue through all connected sites

## What's new in 3.8.16

- Internal changes only.

## What's new in 3.8.15

### Bug Fixes

- Fix issue with create task functionality

## What's new in 3.8.14

### Features

- Add the ability to update the Status column from the child issues table tree

### Bug Fixes

- Allow editing Cloud sites authenticated with an API token

## What's new in 3.8.13

### Features

- Autocomplete the site URL for API token authentication using already OAuth authenticated sites
- Don't require typing https:// when typing the authentication site's URL

## What's new in 3.8.12

### Bug Fixes

- Fixed issue in create issue page when site select is empty after changing issue type
- Fixed style issues on feedback modal

## What's new in 3.8.11

### Features

- Updates Command Palette to have better categories & keywords

### Bug Fixes

- Fixed issue when project value was not updating in create issue page
- Fixed issue when trying to create children issues on epic that had no children to begin with

## What's new in 3.8.10

### Features

- Updates Command Palette to have better categories & keywords
- Fixed usage of deprecated JQL APIs

### Bug Fixes

- Added loading indicator to Refresh button for Jira issue auto-refreshes

## What's new in 3.8.9

### Features

- Added the possibility to remove a reviewer from a PR

### Bug Fixes

- Removed setting options that had no practical or business logic use
- Fixed a bug where Jira site icon is broken in create Jira issue page
- Fixed a bug with getting the error when deleting multiple instances
- Fixed a bug where we could not assign people to a Jira issue as DC users
- Fixed race condition issue when connecting multiple instances

## What's new in 3.8.8

### Features

- Implemented full parent hierarchy display for Jira issues

### Bug Fixes

- Fixed a bug where issues would not render due to malformed epic fields (#665)
- Fixed status button in smaller screen size

## What's new in 3.8.7

### Features

- Update logic of selecting the default project and site to the most relevant one for the user on the Creating a JIRA issue page
- Added filtering for options and error message in projects field on Create Jira issue page

### Bug Fixes

- Fixed a bug when transitioning Jira issues from 'Start work', which doesn't refresh the issues panels
- Added sorting for status transitions based on their workflow order
- Fixed a bug where the 'Vote for this issue' option was not accessible to the reporter
- Fixed a bug with the vote calculation where the username who voted for the issue only updated to the correct value after refreshing the page
- Fixed a bug when Save site button is enabled without valid credentials
- Fixed a bug where after creating a new Jira issue, the issue would not appear in the sidebar
- Fixed a bug where fields were not being cleared after a successful form submission and issue creation
- Fixed an unexpected status dropdown behavior when user doesn't have enough permissions to change it
- Improved the latency for opening, editing, and creating Jira work items

## What's new in 3.8.6

### Features

- Added a `Don't show again` button in the pipeline notification to easily disable this type of notifications

### Bug Fixes

- Fixed a regression in the source branch dropdrown of the Start work page
- Fixed sometimes the 'Assigned Jira work items' and 'Custom JQL filters' panels don't retrieve recently edited items
- Fixed a bug when slash is missing after custom branch prefix in branch naming
- Fixed bug when Jira issue view in active tab doesn't refresh itself after VS Code get focus

## What's new in 3.8.5

### Bug Fixes

- Fixed a regression in the branch prefix dropdrown of the Start work page

## What's new in 3.8.4

### Features

- Added {{{username}}} keyword for Jira's custom branch template

### Bug Fixes

- Fixed a bug when creating jira issues which was throwing the error 'cannot read properties of undefined'
- Fixed a bug when fetching Pull Request commits because the URL for it is undefined
- Fixed the Pull Request 'File nesting' toggle
- Removed duplicated and trailing dashes on proposed branch name in 'Start work' page

## What's new in 3.8.3

### Features

- It is now possible to transition Jira work items to a different status from the sidebar, via `Transition Issue...` context menu option
- Notifications for unseen & recent comments on Jira and Bitbucket are now supported

## What's new in 3.8.2

### Improvement

- Removed the word "Labs" from the title of the extension

## What's new in 3.8.1

### Features

- Banner notifications may be displayed if user is in an unauthenticated state.
- Added rich text editing capabilities for Jira Issue editing and creation

## What's new in 3.8.0

### Improvements

- Badge notifications may be displayed if user is in an unauthenticated state.

## What's new in 3.6.6

- Internal changes only

## What's new in 3.6.5

### Improvements

- Added support for opening a Jira Issue via URI in the form `vscode://atlassian.atlascode/openJiraIssue?key=<issueKey>&site=<siteHost>&source=<URI_source>`
- Added support for start working on a Jira Issue via URI in the form `vscode://atlassian.atlascode/startWorkOnJira?key=<issueKey>&site=<siteHost>&source=<URI_source>`

## What's new in 3.6.4

### Bug fixes

- Fixed "already registered id" error when rendering PR related issues in the Bitbucket Pull Requests side panel.

## What's new in 3.6.3

- Internal changes only

## What's new in 3.6.2

### Bug fixes

- Fixed global window bug which affected polyglot/juptyer notebook users

## What's new in 3.6.1

### Features

- Added informational panel when user clicks on create PR link in terminal which asks whether to create PR in extension or continue to browser

### Bug fixes

- Fixed bug where field validators in Create Issue Page crash page when there is a custom required number field

## What's new in 3.6.0

### Deprecations

- Following the official deprecation of Bitbucket issues, and their very low usage in our extension, we have removed the Bitbucket issues functionality from Atlascode.

    Users who still need to use the Bitbucket issues functionality can manually install the latest version supporting it: v3.4.25.

### Bug fixes

- Fixed bug where Epic/Parent links on Jira Issue Screen Navigation are not clickable

## What's new in 3.4.25

### Improvements

- The 'Release notes' button on the update notification now lands on the VS Code markeplace page for Atlascode, Changelog tab.

### Bug fixes

- Some Jira issues weren't loading due to poor handling of missing fields.

## What's new in 3.4.24

### Improvements

- Updated and improved styling in CreateIssueScreen
- Focus on the Atlascode UI panels when the Onboarding view triggers

### Bug fixes:

- Fixed bug in Bitbucket DC for PRs with comments where the PR Details would not display.

## What's new in 3.4.23

### Improvements

- Updated and improved styling in ViewIssueScreen

## What's new in 3.4.22

### Improvements

- Changed text in the onboarding flow to "Sign in to \_\_\_\_." Used to be "What version of {product} do you use?"

## What's new in 3.4.21

### Bug Fixes

- Fixed a bug introduced in 3.4.20 causing the same issue being retrieved by different JQL queries in the 'Custom JQL filters panel' fail to render.

## What's new in 3.4.20

### Features

- New 'Assigned Jira work items' side panel, showing all and only the Jira issues assigned to the user
- Note: the above feature is controlled under an experiment flag that could be turned off server side.

### Improvements

- The existing 'Jira issues' panel is being renamed to 'Custom JQL filters' and now it only shows the customized JQL queries. If there are no customized JQLs, the panel will stay hidden.
- Note: the above change is controlled under an experiment flag that could be turned off server side.

## What's new in 3.4.19

- Internal changes only.

## What's new in 3.4.18

### Bug Fixes

- Were you experiencing issues with commands not being found for the Atlassian extension? Please follow steps here after installing this version:
    - Delete all auths under Settings > Jira > Authentication section
    - Re-authenticate.
    - If you are still experiencing issues, please comment on https://github.com/atlassian/atlascode/issues/219

### Improvements

- Improved new Onboarding authentication UI.

## What's new in 3.4.17

- Internal changes only.

## What's new in 3.4.16

- Internal changes only.

## What's new in 3.4.15

### Improvements

- 'Push the new branch to remote' toggle is now a child of the 'Set up git branch' toggle

### Bug Fixes

- Editing comments in PRs work.

## What's new in 3.4.14

### Improvements

- Improved the performance of BitBucket pull requests for large repositories by dividing APIs into critical and non-critical flows.

## What's new in 3.4.13

### Features

- Added a loading state for the 'Checkout source Branch' button in BitBucket pull requests.
- Added a loading icon for the BitBucket pull request summary section.

### Bug Fixes

- Fixed exceptions thrown during a failed stat-sig initialization for experimentations.
- Fixed the time-out error that prevented the BitBucket pull request to load for large repos.

## What's new in 3.4.12

### Rollback Release !!

- Same as 3.4.7
- Rolled back several releases as we investigate a possible regression in the authentication flow.

## What's new in 3.4.11

- Internal changes only.

## What's new in 3.4.10

### Bug Fixes

- Fixed the bug introduced in 3.4.8 for Server / Data Center users on Authentication.

## What's new in 3.4.9

### Rollback Release !!

- Same as 3.4.7
- Rolled back 3.4.8 release as it contained a breaking bug for Server / Data Center users on Authentication.

## What's new in 3.4.8

### Features

- Added a new toggle switch in 'Start work' page to choose if the new branch should be automatically pushed to remote.

## What's new in 3.4.7

### Bug Fixes

- Fixed 'Create Jira issue' page getting stuck on the loader when the first Jira server is unreachable.
- Fixed 'Start work' not working when another 'Start work' tab is open.

## What's new in 3.4.6

### Features

- Cleaned up feature flag for Jira Cloud authentication from Remote Development Environments
- Placed code for Auth UI experiment. Still needs additional work before we turn this on.

## What's new in 3.4.5

### Bug Fixes

- Fixed bitbucket PR erroring out due to deprecated API being used

## What's new in 3.4.4

### Bug Fixes

- Fixed images not showing up in Jira tickets' description and comments

## What's new in 3.4.3

### Bug Fixes

- Fixed Bitbucket Data Center Auth not working for usernames with special characters.

## What's new in 3.4.2

### Bug Fixes

- Fixed file not found error when attaching files to Jira tickets

## What's new in 3.4.1

### Improvements

- Lowered VS Code engine compatibility to v1.77.0

## What's new in 3.4.0

### Bug Fixes

- Fixed several API calls broken due to a breaking change introduced since Jira DC 8.4.0, which causes Jira tickets to not be displayed (404 error)

## What's new in 3.2.3

### Bug Fixes

- Fix on create Issue for JIRA cloud when there were no attachments.

## What's new in 3.2.2

### Bug Fixes

- Issues fetched from multiple JIRA sites now display correctly in the tree
- Error banner no longer causes JIRA issue page to crash
- Added workaround to fix completion for JIRA Reporter field
- Fixed link in the Start Work flow for adding JIRAs to commit messages [Issue 70](https://github.com/atlassian/atlascode/issues/70)

## What's New in 3.2.0

### Improvements

- PAT authentication is now supported for Bitbucket Data Center / Server.

### Bug Fixes

## What's New in 3.0.16

### Improvements

- License Change from MIT to Apache to align with Atlassian Open Source Standards
- Moved source code and release process from Bitbucket to Github for better collaboration with community
- Usage of pre-releases. We will follow the convention of even numbered minor release being the stable release ex: "xx.2.xx" . Odd numbers will be the pre-releases.

### Bug Fixes

## What's New in 3.0.11

### Improvements

- A number of small improvements on the package structure
- Re-enabled authentication when VS Code is running remotely

## What's New in 3.0.10

### Bugs fixed

- Fixed bug that caused comments in the PR diff view to stop showing up.

### Improvements

- Fixed Incomplete List of Disallowed Inputs vulnerability in affected versions of babel/traverse.
- Fixed Prototype Pollution vulnerability in affected versions of axios

## What's New in 3.0.9

### Bugs fixed

- Resolved the issue of Visual Studio Code highlighting OpenID Connect properties as errors in bitbucket-pipelines.yml files.

## What's New in 3.0.8

### Improvements

- Fixed the vulnerability in axios

## What's New in 3.0.7

### Bugs fixed

- Fixed bug that would show "cannot get client for jira" and/or "cannot get client for bitbucket" error to logged in users upgrading
  to atlascode latest version from version 3.0.4 or older, after keytar is deprecated.
- Fixed bug that caused the “reviewers” text box in the “Create Pull Request” screen to fail.

## What's New in 3.0.6

### Bugs fixed

- Resolved an issue where the extension was not functioning correctly for repositories with a period in their names.

## What's New in 3.0.5

### Improvements

- Migrated from keytar to secretstorage

## What's New in 3.0.4

### Bugs fixed

- Fixed bug that required remote to be set in destination branch

## What's New in 3.0.3

### Bugs fixed

- Fixed bug that prevented any operations requiring git branches to work properly

## What's New in 3.0.2

### Improvements

- Improved description of pipelines import

## What's New in 3.0.1

### Improvements

- Now allow changing the remote when creating a PR
- Updates to the Bitbucket Pipelines cache schema (Thanks to Skyler Cowley)

## What's New in 3.0.0

### Improvements

- Update to handle changes in how Atlassian handles authentication. It's possible you will need to log in again after this update
- Removed "Created from Atlassian for VS Code" footer when creating a new issue or pull request
- Updates to Bitbucket Pipelines configuration file validation (Thanks to Damian Karzon. Additional thanks to Jim den Otter)

## What's New in 2.10.12

### Bugs fixed

- Fixed bug that prevented displaying pull requests if any files had been deleted
- Fixed bug that prevented display of repos on Start Work screen when not using Bitbucket

## What's New in 2.10.11

### Improvements

- Update to handle changes to Bitbucket pull request API

## What's New in 2.10.9

### Improvements

- Use new image endpoint for Jira attachments

## What's New in 2.10.7

### Bugs fixed

- Fixed bug that could prevent credential refreshes when multiple workspaces are open

## What's New in 2.10.6

### Bugs fixed

- Fixed bug preventing the viewing of pull request details for Bitbucket Server

## What's New in 2.10.5

### Bugs fixed

- Fixed viewing comments in pull requests

## What's New in 2.10.4

### Bugs fixed

- Fixed bug preventing old accounts from updating their credentials (you may need to log in one last time for this to take effect)

## What's New in 2.10.3

### Bugs fixed

- Update to error logging

## What's New in 2.10.2

### Bugs fixed

- Fixed bug causing users to get logged out frequently

## What's New in 2.10.1

### Bugs fixed

- Fixed bug causing excessive calls to refresh Bitbucket Pipelines status

## What's New in 2.10.0

### Improvements

- Enable refresh token rotation for Jira Cloud
- Allow setting the default pull request filter via the VS Code settings (Thanks to Ian Chamberlain)

### Bugs fixed

- Fixed bug preventing viewing Bitbucket Pipelines while building
- Hovering over issue keys for projects with digits in their IDs should now work (Again, thanks to Ian Chamberlain)

## What's New in 2.9.1

### Bugs fixed

- Fixed bug preventing viewing pull requests on Bitbucket Server
- Fixed bug preventing time tracking on Jira issues

## What's New in 2.9.0

### Improvements

- Added support for the use of personal access tokens with Jira Server

## What's New in 2.8.6

### Improvements

- Added URI handler to open specific Jira issue
- Added filter for unreviewed pull requests

### Bugs fixed

- Fixed issue preventing the extension from correctly showing that file had been renamed
- Opening file from the pull request view no longer causes the pull request view to scroll back to the top of the page

## What's New in 2.8.5

### Improvements

- Added messaging explaining how to disable auto-refresh
- Close source branch option behavior now matches that of the webpage
- Can now log work outside of traditional business hours

### Bugs fixed

- No longer make repeated calls with invalid credentials on server instances
- Fixed bug that caused transitioned issues to revert to the backlog
- Fixed bug that could cause errors when adding reviewers to a pull request
- Fixed bug preventing the pull request view from updating if a user approves their own pull request

## What's New in 2.8.4

### Improvements

- Open Jira issue image attachments within VS Code
- Support commit-level diffs for pull requests
- Add missing clone config for steps in pipelines yaml validator
- Atlassian Telemetry now respects telemetry.enableTelemetry flag in global settings

### Bugs fixed

- Fixed summary editor size on the create pull request screen
- Fixed styling for expander headers
- Fixed JQL entry being erased when updating query name

## What's New in 2.8.3

### Bugs fixed

- Create PR view now displays correctly when using high contrast theme
- Fixed issue with markdown rendering after editing a PR comment

## What's New in 2.8.2

### Bugs fixed

- Fixed more of the bug that caused Bitbucket Server users to not see PRs

## What's New in 2.8.1

### Bugs fixed

- Fixed bug that caused Bitbucket Server users to not see PRs

## What's New in 2.8.0

### Improvements

- Redesigned pull request webview UI and improved performance
- Show images in description and comments for Jira Cloud issues
- Markdown editor for pull request webview
- Added support for transitioning multiple issues when a pull request is merged
- Show priority and status in treeview tooltip for Jira issues
- Files with comments are indicated with an icon in pull request webviews

### Bugs fixed

- Fixed pull request filters failing for some Bitbucket Server users

## What's New in 2.7.1

### Improvements

- Added better handling of deep links for non-authenticated users
- Fixed typos in settings page and made top bar scrollable

### Bugs fixed

- Comments in PR diff view no longer show up twice when the page is reloaded

## What's New in 2.7.0

### Improvements

- Show images in comments for issues on Jira server instances
- Add hyperlinks to attachment list in Jira issue webview
- Markdown editor for Bitbucket Issue webview

### Bugs fixed

- Fixed an issue affecting authenticating with sites with multi-level context paths

## What's New in 2.6.6

### Improvements

- Removed background polling for connectivity
- Added option in general settings to minimize errors when offline
- Updated the create pull request view
- Sped-up fetching lists of pull requests

## What's New in 2.6.5

### Bugs fixed

- Branch prefix is no longer duplicated when starting work on an issue

## What's New in 2.6.4

### Improvements

- Support for customizing the generated branch name when starting work on an issue
- Updated Create Bitbucket Issue webview UI

### Bugs fixed

- Fixed resource loading in webviews in VS Code Insiders

## What's New in 2.6.3

### Bugs fixed

- Explorer no longer focuses on start up of VS Code
- Webviews load as expected for Windows users

## What's New in 2.6.2

### Improvements

- Better log parsing for Bitbucket Pipelines results
- Pipeline page has been reskinned with Material UI
- Recently merged pull requests can now be viewed in the "Bitbucket Pull Requests" explorer
- Declined pull requests can now be viewed in the "Bitbucket Pull Requests" explorer
- This extension now focuses the explorer after authenticating
- A "Help and Feedback" explorer has been added
- Pull Request preloading has been re-enabled for users with less than 4 repos open
- Start Work message styling has been updated

### Bugs fixed

- "Checkout Source Branch" and "Edit this File" commands now work for Bitbucket Server personal repositories
- Logging work on cloud now works as expected
- Adding pull request reviewers now works as expected
- Added instructions for how to authenticate when using VS Code remotely
- Settings for this extension no longer show up on unrelated extensions in the Extensions menu
- Branch types are selectable again on Bitbucket Server instances
- "Explore" tab of settings page has been restyled to be consistent with our Material UI theme
- The "Bitbucket Pull Requests" treeview will now show the top-level directory
- Better descriptions for some Bitbucket Pipelines configurations
- Webviews running via Remote SSH now work in VS Code Insiders
- High contrast color themes no longer break Webviews

## What's New in 2.6.1

### Improvements

- Added an "Explore" tab to the settings page to help make key features more discoverable

## What's New in 2.6.0

### Improvements

- Onboarding screen has been redesigned and reskinned with Material UI
- Bitbucket issue screen has been redesigned and reskinned with Material UI
- Start Work page has been reskinned with Material UI
- Welcome page has been reskinned with Material UI
- The settings page can now be opened from a context menu in the Extensions view
- Support configuring preferred remotes to view pull requests

### Bugs fixed

- A few styling issues were fixed on the settings page for light mode
- JQL can now be edited for Jira server instances
- Changing refresh intervals now works properly

## What's New in 2.5.1

### Bugs fixed

- Settings page now loads properly

## What's New in 2.5.0

### Improvements

- Refactored settings page to use new material-ui GUI
- Rewrote JQL Editor
- Updated Jira Filter Search
- Authentication notification now contains buttons that perform common actions
- When a repo has submodules, "start work" now creates branches from the parent repo by default
- Matching criteria for mapping Bitbucket repos to sites has been relaxed

### Bugs fixed

- Hid the Approve/Needs work buttons on Bitbucket Server PRs if current user is the PR author
- Reply button in diff view comments now shows up for all comments
- Fixed bug where Jira Issue were showing up blank
- Emoji size in PR diff view comments has been fixed

## What's New in 2.4.11

### Bugs fixed

- No longer show error for certain pipeline configurations
- Create, Search, and Configure nodes no longer disappear from Jira sidebar

## What's New in 2.4.10

### Improvements

- Pull Request descriptions can now be edited
- Jira mentions are now supported from the issue description
- Jira mentions are now supported from the description when creating an issue
- Tab titles have been shortened for Jira/Bitbucket issues and favicons now vary
- Remote branches can now be selected as the source branch on the "Start work on Issue" page
- Pipelines can now be re-run from the Pipelines sidebar or the result summary page
- The start-up time of this extension has been sped up
- You can now start a Bitbucket Pipeline for any branch. Just open the command palette and select “Run Pipeline for Branch”

### Bugs fixed

- Subtasks are no longer excluded from grouped JQL results
- Autogenerated PR titles were made consistent with Bitbucket site
- Credentials for Bitbucket Server sites can now be edited
- Status bar no longer shows invalid issues
- Editing an empty issue description no longer causes a rendering failure
- Non-American style dates are now displayed correctly

## What's New in 2.4.9

### Bugs fixed

- Fixed a bug in extension build

## What's New in 2.4.7

### Bugs fixed

- Fixed loop that could cause infinite credential refreshing in the background

## What's New in 2.4.6

### Bugs fixed

- Pull Request preloading has been reverted to avoid rate-limiting issues

## What's New in 2.4.4

### Bugs fixed

- Fixed a bug in extension build

## What's New in 2.4.3

### Improvements

- If there's only one related issue, don't make the user expand the "Related issues" section
- Edit Jira issue descriptions
- Added "Configure filters..." button below JQL filters in tree
- Pull build status for Bitbucket Server
- Exposed Jira issue results search via command palette
- Improved PR Speed
- Allow user to change password for server sites
- Preload PR data
- Stopped notifying users when URLs are copied to clipboard
- Added repository name to pipeline messages
- Show active Jira issue in status bar

### Bugs fixed

- Jira issue webviews don't render well when narrow
- Long branch names in PRs are not entirely visible
- Merge Dialog not Readable with Dark Theme (High Contrast)

## What's New in 2.4.2

### Bugs fixed

- Fixed certificate handling when adding new Jira sites

## What's New in 2.4.1

### Bugs fixed

- Fix certificate handling for Jira clients

## What's New in 2.4.0

### Improvements

- Jira explorer shows issue count for each JQL entry
- Added ability to search for issues in the Jira explorer
- Support mentioning users in Jira issue comments
- Added context menu and toolbar options in pull request diff view to open the file in a new tab for editing
- Support adding reviewers to existing pull requests
- Support creating Bitbucket issue to parent repo when working on its fork
- Improved support for assigning Bitbucket issues

### Bugs fixed

- Worklog comment is optional now
- Fixed formatting Jira issues in comments
- Fixed pull request merge message not being updated when approval changes
- Fixed pull request and start work screens staying permanently in loading state in some cases

## What's New in 2.3.2

### Improvements

- Updated README to include complete build instructions
- Improved reviewer/mention selection for Bitbucket Cloud pull requests
- It is now possible to reply to any pull request comment in the diff view

### Bugs fixed

- Matched cursor behavior in diff lists to the Bitbucket Cloud website
- Cancelled tasks are now hidden and task deletion doesn't cause strange behavior
- You can now add pull-request-level tasks in Bitbucket Cloud pull requests even when no tasks already exist

## What's New in 2.3.1

### Bugs fixed

- Start work on issue now works correctly again

## What's New in 2.3.0

### Improvements

- Added support for Bitbucket tasks
- Can now edit both time and date when adding a worklog
- Added buttons to create Jira and Bitbucket issues and pull requests to trees in side bar
- Reduced number of Bitbucket API to reduce rate-limit errors
- Preserve file structure when showing pull request contents in the side bar
- Default maximum number of Jira issues fetched via JQL increased from 50 to 100
- Added option to fetch all issues matching JQL
- Made settings titles consistent
- Now have different messages in sidebar when not authenticated with Bitbucket and not having a Bitbucket repo available in the current workspace
- When adding a new Jira site default JQL for that site will now contain `resolution = Unresolved` if the site is configured to support the `resolution` field
- Added support for pull requests from forks
- Default reviewers are now prepopulated for pull requests from forks

### Bugs fixed

- Fixed link to "Select merge strategy" when merging a pull request
- Code blocks in diff-view comments now contain proper highlighting and special characters aren’t escaped
- Fixed issue that prevented using Jira and Bitbucket instances on the same host (for real this time)
- Comment order is now preserved after making a comment on Bitbucket Server
- Made "Needs work" button more readable when using a dark theme
- Can now log work on Jira Server
- Project list is now searchable when creating an issue on Bitbucket Server
- Fixed issue that could cause viewing files in pull requests to be slow

## What's New In 2.2.1

### Improvements

- Added “Group issues by Epic” option to display issues in a list instead of nesting subtasks under issues and issues under Epics

### Bugs fixed

- Fixed bug where special characters were being escaped in the status bar
- Fixed authenticating with multi-level context paths
- Fixed bugs causing subtasks not matching query to be included in JQL results

## What's New In 2.2.0

### Improvements

- Support for importing Jira filters when adding custom JQL entries
- Support editing pull request titles
- Support for custom online check URLs

### Bugs fixed

- Fixed bug where extension does not work when Jira and Bitbucket are set up with the same domain
- Fixed bug where last used Jira project for creating issues was not being saved
- Fixed bug where Jira autocomplete query was not being encoded correctly
- Fixed bug causing internal comment button to not show up on service desk issues
- Fixed bug preventing creation of Bitbucket issues
- Fixed bug where create pull request view kept spinning when no repositories were open
- Fixed issue where Jira issues show in treeview but open a blank screen when opened
- Restrict inline commenting range for Bitbucket Server pull requests
- Fixed delay when refreshing pull requests treeview

## What's New In 2.1.5

### Improvements

- Added welcome screen to help new users get up and running
- Support using existing branches when starting work on an issue

### Bugs fixed

- Fixed issue that could prevent Windows users from adding multiple accounts
- Allow disabling Jira or Bitbucket features globally and re-enabling them at the project level
- Inline comments on Bitbucket Server pull requests no longer show up at the file level
- Fixed diff view comments not refreshing after adding a new comment

## What's New In 2.1.4

### Bugs fixed

- Fixed issue that resulted in failure to save credentials when logging in

## What's New In 2.1.3

### Improvements

- Added tooltip text clarifying that only exact matches are allowed on Bitbucket Server when adding reviewers to a pull request
- When available, specific error messages for git operations are now presented instead of more general error messages

### Bugs fixed

- Jira issues are now correctly assigned when using start work on Jira Server
- Selecting an item from the mention picker when editing a Bitbucket issue now works correctly
- "Create in browser..." button on "Create pull request" screen now links to correct location on Bitbucket Server
- Fixed bug that could prevent Jira issues from presenting up-to-date information

## What's New In 2.1.2

### Improvements

- Allow extension to be used when working in remote workspaces
- Support for adding internal comments on Jira Service Desk issues

### Bugs fixed

- Jira issue status was empty in some cases
- Jira issues showed duplicate transition states in some cases
- Adding reviewers on Bitbucket Cloud pull requests would show an error
- Code blocks in inline comments were not formatted correctly
- Bitbucket issue creation was failing
- Bitbucket issue sidebar styling was inconsistent
- Fixed copy for creating pull request externally
- Fixed link to prepare-commit-message snippet

## What's New In 2.1.1

### Improvements

- Added support for tunneling https when using a proxy server
- Now using a reasonable placeholder for broken images

### Bugs fixed

- Jira issue screen broken due to missing priority field
- Jira issue screen broken due to missing subtasks field
- Bitbucket repos not recognized if remote URL includes a port
- Bitbucket start work on issue not working
- Code block in comments too dark to see in dark themes
- Pipelines explorer filters not working properly

## What's New In 2.1.0

### Improvements

- Clicking on a pull request preview file now opens the file
- Added advanced SSL options to custom login screen
- Added context path option to custom login screen
- Now showing PR approval status in explorer tooltip

### Bugs fixed

- Bitbucket pull request filters not working
- Sometimes issue screen would be blank
- Online/Offline checker sometimes gave wrong results

## What's New In 2.0.4

### Bugs fixed

- Some Jira fields not populating due to invalid field keys

## What's New In 2.0.3

### Improvements

- Removed the file changes count limit for pull requests
- Webview tabs now have an Atlassian icon

### Bugs fixed

- Create Issue page not loading in some instances
- Webviews didn't allow images to load over http
- Various undefined values would throw errors due to lack of boundry checking
- Doc links fixed and various spelling corrections

## What's New In 2.0.1

### Improvements

- Added support for plain http when connecting to server instances
- Added experimental support for self-signed certificates

### Bugs fixed

- Fixed Bitbucket authentication not working

## What's New In 2.0.0

### Improvements

- Support for Jira Server and Bitbucket Server
- Support for a wider range of Jira features and configurations
    - Time tracking
    - Adding sprints to issues
    - Not having a resolution field
    - And more!
- View JQL from multiple sites at once in Jira explorer
- Improved Settings
    - Jira and Bitbucket now have their own sections in the settings
    - Jira or Bitbucket features can now be completely disabled
    - Settings can now be saved at either the user level or the workspace level
    - Notifications can be managed and disabled for individual JQL queries
- Can now collapse all comments on a pull-request
- Selected code will now be included in description when creating issue from a TODO
- Get the latest information by refreshing any webview
- Improved performance when creating pull-requests or starting work on issues
- Easily edit the branch name when starting work on an issue
- Pre-filled mention picker when creating pull requests and Bitbucket issues
- Editing and deleting comments in pull requests
- Added support for merge commit messages
- Added diff preview in pull request views
- Added support for Bitbucket mirrors

### Bugs fixed

- Build statuses now link to the tool that created them
- Fixed URL creation on Windows
- `TODO` triggers no longer require a trailing space
- Subtasks now report the correct status
- Pipelines builds triggered manually or by tag creation now notify correctly and show up in the pipelines side bar
- Username was not slugified when making calls during Bitbucket server auth flow
- Sometimes webviews would not load data
- Transitions are now reloaded when an issue is transitioned to get any new available options
- Fixed bad default JQL in settings.json
- Fixed error when checking for an empty user object
- Fixed issue with credentials not saving for all sites

## What's New In 1.4.3

### Improvements

- Show Jira issue key in explorer

### Bugs fixed

- Webviews show loading message when they come to focus
- Jira issue created notifications do not show up sometimes

## What's New In 1.4.2

### Improvements

- Allow using currentProject() in custom jql
- Make Your/Open Issues editable custom JQL entries

### Bugs fixed

- Comment API changes for VS Code May Updates

## What's New In 1.4.1

### Improvements

- Updated marketplace listing name to feature Jira and Bitbucket
- Add ability to modify a subset of fields on Jira details screen

### Bugs fixed

- Panel text colours appear washed out in Jira webview

## What's New In 1.4.0

### Improvements

- Store Jira working project as workspace config if possible
- Update assignee in Jira issue view
- Show conflicted state for a pull request file in tree view
- Show merge checklist before merging
- Reduce number of git calls for better performance on large PRs
- Better emoji styling in pull request webview
- Add loading indicator when posting comment on webviews
- Ticket comments should include date/time metadata
- Allow filtering of Pipelines
- Make Bitbucket features work with SSH aliases
- Bitbucket features work with repositories cloned with https protocol
- Better date format on pull request commit list
- Update to latest VS Code comments api
- Offline detection is too aggressive
- Use Atlassian urls for online checks
- Authentication related fixes and improvements

### Bugs fixed

- Epic fields are being duplicated in Jira API requests
- Other issues from the same epic showing up in JQL results
- Checkout source branch button doesn't update correctly
- Pull requests with large number of files do not work properly
- Large pull requests spawn large number of git/console host processes on refresh/comment change
- PR comments disappearing after some time
- Unable to start pipeline from explorer

## What's New In 1.3.1

### Bugs fixed

- Cannot create Jira issues in certain cases if epic is not specified
- Jira treeviews show no issues after some time

## What's New In 1.3.0

### Improvements

- Now using port 31415 for auth listener instead of 9090
- Added custom prefix for branches when starting work on issue
- Added Jira epics in issue details view
- Added ability to link to an epic on Jira create issue
- It's now possible to create an Epic issue
- Merge actions similar to Bitbucket webpage (merge type/close source branch etc)
- Option to transition Jira/Bitbucket issue when creating/merging pull requests
- Support for creating issue-links on Jira create screen
- Added related issues and transition option to create pull request screen
- Now showing better messaging when no Bitbucket project is open
- Show merge conflicts in pull request treeview
- Added non-renderable field warnings and report for Jira create issue
- Added ability to create a Jira issue from a Bitbucket issue and link them
- Ensure webview controllers don't refresh multiple times at once

### Bugs fixed

- Transition menu in start work on issue does not work
- Pull request merge fails silently when there are conflicts
- Create pull request screen shows blank page when remote branch is deleted

## What's New In 1.2.3

### Bugs fixed

- JQL error when opening related Jira issues in the pull request tree

## What's New In 1.2.2

### Improvements

- Extension works with [Bitbucket's upcoming API changes](https://developer.atlassian.com/cloud/bitbucket/bitbucket-api-changes-gdpr/) related to user privacy
- Context menu item in treeviews to open in browser
- Support to add an issue link when creating a Jira issue

## What's New In 1.2.1

### Improvements

- Added Jira issue links to Issue Details view
- The configured development branch is now the default source when starting work on an issue
- Added more default issue code link triggers
- (experimental) bitbucket-pipelines.yml editing support
- Added external [user guide](https://confluence.atlassian.com/display/BITBUCKET/Getting+started+with+VS+Code)

### Bugs fixed

- Mention names in pull request comments are not shown properly
- Transition menu on start work page not working
- PR create screen is not splitting the title and description correctly

## What's New In 1.2.0

### Improvements

- Start work from Bitbucket issue webview
- Show additional information in Jira issue view (reporter, Bitbucket pull request status)
- Add issue titles to Jira notifications
- Option to close source branch after merge when creating pull request
- Made pipelines header consistent with other webviews
- Use new VS Code API for comments in pull requests

### Bugs fixed

- Long code blocks in Jira issues break out of their column
- Markdown doesn't render in comments on Jira issues
- Hovering on issue key to get details not working
- Pipeline summary fails for in-progress builds

## What's New In 1.1.0

### Improvements

- Code hint to create issue from comment triggers
- Add right-click create Jira issue in code view
- Open Jira issue by key from command palette
- Explorer for Bitbucket issues
- Webview to create, view and update Bitbucket issues
- Notifications for new Bitbucket issues
- Show related Bitbucket issues in pull requests
- Show recent Bitbucket pull requests for Jira issues
- Improve issue created message when multiple issues are created one after another
- Allow user to view logs from pipeline builds
- Separate pipelines results by repo
- Improve subtask display in treeviews to respect jql filter
- Improvement and consistency for error messages in webviews

### Bugs fixed

- Welcome page opens on every new window
- Pull request comments are being duplicated when treeview is refreshed
- Fix auth timeout tab opening randomly sometimes
- Handle cases when default site is not selected in settings screen
- Filter out done issues in 'Your Issues' treeview
- Fix pipelines result display with manual deployments
- Jira issue details were not loading completely in some cases

## What's New In 1.0.4

### Bug

- Fixed a bug where upstream branch was not being set properly when starting work on Jira issue

## What's New In 1.0.3

### Bug

- Fixed another case causing extension to open an authentication browser tab occasionally without user interaction

## What's New In 1.0.2

### Bug

- Extension opens an authentication browser tab occasionally without user interaction
- Handle treeviews gracefully when there are no Bitbucket repos
- Jira issue view shows blank page for some issues
- Status bar settings are reset on restart
- Checkboxes did not reflect correct state in settings page

### Improvements

- Render markup for description for Jira issues
- Group sub-tasks by parent issue in tree view
- Show parent issue link for sub-tasks in Jira details view
- Improve styling on start work success message
- Remove/disable start work button on issue screen if you're already on the issue branch
- Moved site selector in settings to authorization section
- Add site selector to the custom jql config screen
- Support for default reviewers while creating pull requests
- Detect dirty working tree and ask user to commit when creating PRs

## What's New In 1.0.1

### Bug

- Extension occasionally opens up a browser window to auth until the user authenticates
- General authentication fixes
- Start work on issue hangs with non-Bitbucket repos
- Custom JQL tree not refreshing when refresh button clicked
- Length check causing View Issue page to disappear
- Pipelines explorer not initializing properly
- Open in Bitbucket context menu item not working on repository nodes
- Create Pull Request hangs with non-Bitbucket Cloud repos

### Improvements

- Add Project key to project selector list to dedupe project names
- Add refresh button to custom JQL tree
