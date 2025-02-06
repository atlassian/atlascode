import {
    AppBar,
    Box,
    Button,
    Container,
    Grid,
    Link,
    Paper,
    Theme,
    Toolbar,
    Typography,
    makeStyles,
} from '@material-ui/core';
import { WelcomeControllerContext, useWelcomeController } from './welcomeController';

import { IconLink } from '@atlassianlabs/guipi-core-components';
import React from 'react';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { FeedbackDialogButton } from '../common/feedback/FeedbackDialogButton';
import BitbucketIcon from '../icons/BitbucketIcon';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1),
            },
            grow: {
                flexGrow: 1,
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            paperOverflow: {
                overflow: 'hidden',
            },
        }) as const,
);

const WelcomePage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useWelcomeController();

    return (
        <WelcomeControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.WelcomePage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="lg">
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                {l10n.t('Welcome To Atlassian for VS Code!')}
                            </Typography>
                        </Toolbar>
                    </AppBar>
                    <Grid container spacing={1}>
                        <Grid item xs={9} md={9} lg={9} xl={9}>
                            <Paper className={classes.paper100}>
                                <ErrorDisplay />
                                <Box margin={2} fontSize="0.85rem">
                                    <Grid container spacing={1} direction="column">
                                        <Grid item>
                                            <h2>{l10n.t('{0} First Time Here? {1}', '🎉')}</h2>
                                            <section>
                                                <div>
                                                    <p>
                                                        {l10n.t(
                                                            "To get started, you'll need to authenticate with Jira and/or Bitbucket from the configuration screen",
                                                        )}
                                                    </p>
                                                    <p>
                                                        click <em>Configure Settings</em> to access the configuration 👉
                                                    </p>
                                                    <p>
                                                        {l10n.t(
                                                            'The configuration screen can also be used to completely customize the extension to fit your own workflow.',
                                                        )}
                                                    </p>
                                                    <p>
                                                        {l10n.t(
                                                            "You can always get to the configuration screen by opening the command palette and typing 'Atlassian: Open Settings'",
                                                        )}
                                                    </p>
                                                </div>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.10')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that caused comments in the PR diff view to stop
                                                        showing up
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed Incomplete List of Disallowed Inputs vulnerability in
                                                        affected versions of babel/traverse.
                                                    </li>
                                                    <li>
                                                        Fixed Prototype Pollution vulnerability in affected versions of
                                                        axios
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.9')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Resolved the issue of Visual Studio Code highlighting OpenID
                                                        Connect properties as errors in bitbucket-pipelines.yml files.
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.8')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Fixed the vulnerability in axios</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.7')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that would show "cannot get client for jira" and/or
                                                        "cannot get client for bitbucket" error to logged in users
                                                        upgrading to atlascode latest version from version 3.0.4 or
                                                        older, after keytar is deprecated.
                                                    </li>
                                                </ul>
                                                <ul>
                                                    <li>
                                                        Fixed bug that caused the “reviewers” text box in the “Create
                                                        Pull Request” screen to fail.
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.6')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Resolved an issue where the extension was not functioning
                                                        correctly for repositories with a period in their names.
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.5')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Migrated from keytar to secretstorage</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.4')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that required remote to be set in destination branch
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.3')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that prevented any operations requiring git branches
                                                        to work properly
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.2')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Improved description of pipelines import</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.1')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Now allow changing the remote when creating a PR</li>
                                                    <li>
                                                        Updates to the Bitbucket Pipelines cache schema (Thanks to
                                                        Skyler Cowley)
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '3.0.0')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        UpdatUpdate to handle changes in how Atlassian handles
                                                        authentication. It's possible you will need to log in again
                                                        after this update
                                                    </li>
                                                    <li>
                                                        Removed "Created from Atlassian for VS Code" footer when
                                                        creating a new issue or pull request
                                                    </li>
                                                    <li>
                                                        Updates to Bitbucket Pipelines configuration file validation
                                                        (Thanks to Damian Karzon. Additional thanks to Jim den Otter)
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.12')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that prevented displaying pull requests if any files
                                                        had been deleted
                                                    </li>
                                                </ul>
                                                <ul>
                                                    <li>
                                                        Fixed bug that prevented display of repos on Start Work screen
                                                        when not using Bitbucket
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.11')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Update to handle changes to Bitbucket pull request API</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.9')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Use new image endpoint for Jira attachments</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.7')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug that could prevent credential refreshes when multiple
                                                        workspaces are open
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.6')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug preventing the viewing of pull request details for
                                                        Bitbucket Server
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.5')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed viewing comments in pull requests</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.4')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug preventing old accounts from updating their
                                                        credentials (you may need to log in one last time for this to
                                                        take effect)
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.3')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Update to error logging</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.2')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed bug causing users to get logged out frequently</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.1')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug causing excessive calls to refresh Bitbucket Pipelines
                                                        status
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.10.0')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Enable refresh token rotation for Jira Cloud</li>
                                                    <li>
                                                        Allow setting the default pull request filter via the VS Code
                                                        settings (Thanks to Ian Chamberlain)
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug preventing viewing Bitbucket Pipelines while building
                                                    </li>
                                                    <li>
                                                        Hovering over issue keys for projects with digits in their IDs
                                                        should now work (Again, thanks to Ian Chamberlain)
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.9.1')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug preventing viewing pull requests on Bitbucket Server
                                                    </li>
                                                    <li>Fixed bug preventing time tracking on Jira issues</li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.9.0')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added support for the use of personal access tokens with Jira
                                                        Server
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.6')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Added URI handler to open specific Jira issue</li>
                                                    <li>Added filter for unreviewed pull requests</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed issue preventing the extension from correctly showing that
                                                        file had been renamed
                                                    </li>
                                                    <li>
                                                        Opening file from the pull request view no longer causes the
                                                        pull request view to scroll back to the top of the page
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.5')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Added messaging explaining how to disable auto-refresh</li>
                                                    <li>
                                                        Close source branch option behavior now matches that of the
                                                        webpage
                                                    </li>
                                                    <li>Can now log work outside of traditional business hours</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        No longer make repeated calls with invalid credentials on server
                                                        instances
                                                    </li>
                                                    <li>
                                                        Fixed bug that caused transitioned issues to revert to the
                                                        backlog
                                                    </li>
                                                    <li>
                                                        Fixed bug that could cause errors when adding reviewers to a
                                                        pull request
                                                    </li>
                                                    <li>
                                                        Fixed bug preventing the pull request view from updating if a
                                                        user approves their own pull request
                                                    </li>
                                                </ul>
                                            </section>
                                            <h4>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.4')}</h4>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Open Jira issue image attachments within VS Code</li>
                                                    <li>Support commit-level diffs for pull requests</li>
                                                    <li>
                                                        Add missing clone config for steps in pipelines yaml validator
                                                    </li>
                                                    <li>
                                                        Atlassian Telemetry now respects telemetry.enableTelemetry flag
                                                        in global settings
                                                    </li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed summary editor size on the create pull request screen</li>
                                                    <li>Fixed styling for expander headers</li>
                                                    <li>Fixed JQL entry being erased when updating query name</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.3')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Create PR view now displays correctly when using high contrast
                                                        theme
                                                    </li>
                                                    <li>
                                                        Fixed issue with markdown rendering after editing a PR comment
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.2')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed more of the bug that caused Bitbucket Server users to not
                                                        see PRs
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed bug that caused Bitbucket Server users to not see PRs</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.8.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Redesigned pull request webview UI and improved performance</li>
                                                    <li>
                                                        Show images in description and comments for Jira Cloud issues
                                                    </li>
                                                    <li>Markdown editor for pull request webview</li>
                                                    <li>
                                                        Added support for transitioning multiple issues when a pull
                                                        request is merged
                                                    </li>
                                                    <li>
                                                        Show priority and status in treeview tooltip for Jira issues
                                                    </li>
                                                    <li>
                                                        Files with comments are indicated with an icon in pull request
                                                        webviews
                                                    </li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed pull request filters failing for some Bitbucket Server
                                                        users
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.7.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added better handling of deep links for non-authenticated users
                                                    </li>
                                                    <li>Fixed typos in settings page and made top bar scrollable</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Comments in PR diff view no longer show up twice when the page
                                                        is reloaded
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.7.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Show images in comments for issues on Jira server instances</li>
                                                    <li>Add hyperlinks to attachment list in Jira issue webview</li>
                                                    <li>Markdown editor for Bitbucket Issue webview</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed an issue affecting authenticating with sites with
                                                        multi-level context paths
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.4')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Support for customizing the generated branch name when starting
                                                        work on an issue
                                                    </li>
                                                    <li>Updated Create Bitbucket Issue webview UI</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed resource loading in webviews in VS Code Insiders</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.5')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Branch prefix is no longer duplicated when starting work on an
                                                        issue
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.4')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Support for customizing the generated branch name when starting
                                                        work on an issue
                                                    </li>
                                                    <li>Updated Create Bitbucket Issue webview UI</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed resource loading in webviews in VS Code Insiders</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.3')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Explorer no longer focuses on start up of VS Code</li>
                                                    <li>Webviews load as expected for Windows users</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.2')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Better log parsing for Bitbucket Pipelines results</li>
                                                    <li>Pipeline page has been reskinned with Material UI</li>
                                                    <li>
                                                        Recently merged pull requests can now be viewed in the
                                                        "Bitbucket Pull Requests" explorer
                                                    </li>
                                                    <li>
                                                        Declined pull requests can now be viewed in the "Bitbucket Pull
                                                        Requests" explorer
                                                    </li>
                                                    <li>
                                                        This extension now focuses the explorer after authenticating
                                                    </li>
                                                    <li>A "Help and Feedback" explorer has been added</li>
                                                    <li>
                                                        Pull Request preloading has been re-enabled for users with less
                                                        than 4 repos open
                                                    </li>
                                                    <li>Start Work message styling has been updated</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        "Checkout Source Branch" and "Edit this File" commands now work
                                                        for Bitbucket Server personal repositories
                                                    </li>
                                                    <li>Logging work on cloud now works as expected</li>
                                                    <li>Adding pull request reviewers now works as expected</li>
                                                    <li>
                                                        Added instructions for how to authenticate when using VS Code
                                                        remotely
                                                    </li>
                                                    <li>
                                                        Settings for this extension no longer show up on unrelated
                                                        extensions in the Extensions menu
                                                    </li>
                                                    <li>
                                                        Branch types are selectable again on Bitbucket Server instances
                                                    </li>
                                                    <li>
                                                        "Explore" tab of settings page has been restyled to be
                                                        consistent with our Material UI theme
                                                    </li>
                                                    <li>
                                                        The "Bitbucket Pull Requests" treeview will now show the
                                                        top-level directory
                                                    </li>
                                                    <li>
                                                        Better descriptions for some Bitbucket Pipelines configurations
                                                    </li>
                                                    <li>
                                                        Webviews running via Remote SSH now work in VS Code Insiders
                                                    </li>
                                                    <li>High contrast color themes no longer break Webviews</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added an "Explore" tab to the settings page to help make key
                                                        features more discoverable
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.6.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Onboarding screen has been redesigned and reskinned with
                                                        Material UI
                                                    </li>
                                                    <li>
                                                        Bitbucket issue screen has been redesigned and reskinned with
                                                        Material UI
                                                    </li>
                                                    <li>Start Work page has been reskinned with Material UI</li>
                                                    <li>Welcome page has been reskinned with Material UI</li>
                                                    <li>
                                                        The settings page can now be opened from a context menu in the
                                                        Extensions view
                                                    </li>
                                                    <li>Support configuring preferred remotes to view pull requests</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        A few styling issues were fixed on the settings page for light
                                                        mode
                                                    </li>
                                                    <li>JQL can now be edited for Jira server instances</li>
                                                    <li>Changing refresh intervals now works properly</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.5.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Settings page now loads properly</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.5.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Refactored settings page to use new material-ui GUI</li>
                                                    <li>Rewrote JQL Editor</li>
                                                    <li>Updated Jira Filter Search</li>
                                                    <li>
                                                        Authentication notification now contains buttons that perform
                                                        common actions
                                                    </li>
                                                    <li>
                                                        When a repo has submodules, "start work" now creates branches
                                                        from the parent repo by default
                                                    </li>
                                                    <li>
                                                        Matching criteria for mapping Bitbucket repos to sites has been
                                                        relaxed
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Hide the Approve/Needs work buttons on Bitbucket Server PRs if
                                                        current user is the PR author
                                                    </li>
                                                    <li>
                                                        Reply button in diff view comments now shows up for all comments
                                                    </li>
                                                    <li>Fixed bug where Jira Issue were showing up blank</li>
                                                    <li>Emoji size in PR diff view comments has been fixed</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.11')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>No longer show error for certain pipeline configurations</li>
                                                    <li>
                                                        Create, Search, and Configure nodes no longer disappear from
                                                        Jira sidebar
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.10')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Pull Request descriptions can now be edited</li>
                                                    <li>Jira mentions are now supported from the issue description</li>
                                                    <li>
                                                        Tab titles have been shortened for Jira/Bitbucket issues and
                                                        favicons now vary
                                                    </li>
                                                    <li>
                                                        Remote branches can now be selected as the source branch on the
                                                        "Start work on Issue" page
                                                    </li>
                                                    <li>
                                                        Pipelines can now be re-run from the Pipelines sidebar or the
                                                        result summary page
                                                    </li>
                                                    <li>The start-up time of this extension has been sped up</li>
                                                    <li>
                                                        You can now start a Bitbucket Pipeline for any branch. Just open
                                                        the command palette and select “Run Pipeline for Branch”
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Subtasks are no longer excluded from grouped JQL results</li>
                                                    <li>
                                                        Autogenerated PR titles were made consistent with Bitbucket site
                                                    </li>
                                                    <li>Bitbucket sites can now be edited</li>
                                                    <li>Status bar no longer shows invalid issues</li>
                                                    <li>
                                                        Editing an empty issue description no longer causes a rendering
                                                        failure
                                                    </li>
                                                    <li>Non-American style dates are now displayed correctly</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.9')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed a bug in extension build</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.7')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed loop that could cause infinite credential refreshing in
                                                        the background
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.6')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Pull Request preloading has been reverted to avoid rate-limiting
                                                        issues
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.4')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed a bug in extension build</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.3')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        If there's only one related issue, don't make the user expand
                                                        the "Related issues" section
                                                    </li>
                                                    <li>Edit Jira issue descriptions</li>
                                                    <li>
                                                        Added "Configure filters..." button below JQL filters in tree
                                                    </li>
                                                    <li>Pull build status for Bitbucket Server</li>
                                                    <li>Exposed Jira issue results search via command palette</li>
                                                    <li>Improved PR Speed</li>
                                                    <li>Allow user to change password for server sites</li>
                                                    <li>Preload PR data</li>
                                                    <li>Stopped notifying users when URLs are copied to clipboard</li>
                                                    <li>Added repository name to pipeline messages</li>
                                                    <li>Show active Jira issue in status bar</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Jira issue webviews don't render well when narrow</li>
                                                    <li>Long branch names in PRs are not entirely visible</li>
                                                    <li>Merge Dialog not Readable with Dark Theme (High Contrast)</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.2')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed certificate handling when adding new Jira sites</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fix certificate handling for Jira clients</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.4.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Jira explorer shows issue count for each JQL entry</li>
                                                    <li>Added ability to search for issues in the Jira explorer</li>
                                                    <li>Support mentioning users in Jira issue comments</li>
                                                    <li>
                                                        Added context menu and toolbar options in pull request diff view
                                                        to open the file in a new tab for editing
                                                    </li>
                                                    <li>Support adding reviewers to existing pull requests</li>
                                                    <li>
                                                        Support creating Bitbucket issue to parent repo when working on
                                                        its fork
                                                    </li>
                                                    <li>Improved support for assigning Bitbucket issues</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Worklog comment is optional now</li>
                                                    <li>Fixed formatting Jira issues in comments</li>
                                                    <li>
                                                        Fixed pull request merge message not being updated when approval
                                                        changes
                                                    </li>
                                                    <li>
                                                        Fixed pull request and start work screens staying permanently in
                                                        loading state in some cases
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.3.2')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Updated README to include complete build instructions</li>
                                                    <li>
                                                        Improved reviewer/mention selection for Bitbucket Cloud pull
                                                        requests
                                                    </li>
                                                    <li>
                                                        It is now possible to reply to any pull request comment in the
                                                        diff view
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Matched cursor behavior in diff lists to the Bitbucket Cloud
                                                        website
                                                    </li>
                                                    <li>
                                                        Cancelled tasks are now hidden and task deletion doesn't cause
                                                        strange behavior
                                                    </li>
                                                    <li>
                                                        You can now add pull-request-level tasks in Bitbucket Cloud pull
                                                        requests even when no tasks already exist
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.3.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Start work on issue now works correctly again</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.3.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Added support for Bitbucket tasks</li>
                                                    <li>Can now edit both time and date when adding a worklog</li>
                                                    <li>
                                                        Added buttons to create Jira and Bitbucket issues and pull
                                                        requests to trees in side bar
                                                    </li>
                                                    <li>
                                                        Reduced number of Bitbucket API requests to reduce rate-limit
                                                        errors
                                                    </li>
                                                    <li>
                                                        Preserve file structure when showing pull request contents in
                                                        the side bar
                                                    </li>
                                                    <li>
                                                        Default maximum number of Jira issues fetched via JQL increased
                                                        from 50 to 100
                                                    </li>
                                                    <li>Added option to fetch all issues matching JQL</li>
                                                    <li>Made settings titles consistent</li>
                                                    <li>
                                                        Now have different messages in sidebar when not authenticated
                                                        with Bitbucket and not having a Bitbucket repo available in the
                                                        current workspace
                                                    </li>
                                                    <li>
                                                        When adding a new Jira site default JQL for that site will now
                                                        contain <code>resolution = Unresolved</code> if the site is
                                                        configured to support the <code>resolution</code> field
                                                    </li>
                                                    <li>Added support for pull requests from forks</li>
                                                    <li>
                                                        Default reviewers are now prepopulated for pull requests from
                                                        forks
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed link to "Select merge strategy" when merging a pull
                                                        request
                                                    </li>
                                                    <li>
                                                        Code blocks in diff-view comments now contain proper
                                                        highlighting and special characters aren’t escaped
                                                    </li>
                                                    <li>
                                                        Fixed issue that prevented using Jira and Bitbucket instances on
                                                        the same host (for real this time)
                                                    </li>
                                                    <li>
                                                        Comment order is now preserved after making a comment on
                                                        Bitbucket Server
                                                    </li>
                                                    <li>
                                                        Made "Needs work" button more readable when using a dark theme
                                                    </li>
                                                    <li>Can now log work on Jira Server</li>
                                                    <li>
                                                        Project list is now searchable when creating an issue on
                                                        Bitbucket Server
                                                    </li>
                                                    <li>
                                                        Fixed issue that could cause viewing files in pull requests to
                                                        be slow
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.2.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added “Group issues by Epic” option to display issues in a list
                                                        instead of nesting subtasks under issues and issues under Epics
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug where special characters were being escaped in the
                                                        status bar
                                                    </li>
                                                    <li>Fixed authenticating with multi-level context paths</li>
                                                    <li>
                                                        Fixed bugs causing subtasks not matching query to be included in
                                                        JQL results
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.2.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Support for importing Jira filters when adding custom JQL
                                                        entries
                                                    </li>
                                                    <li>Support editing pull request titles</li>
                                                    <li>Support for custom online check URLs</li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed bug where extension does not work when Jira and Bitbucket
                                                        are set up with the same domain
                                                    </li>
                                                    <li>
                                                        Fixed bug where last used Jira project for creating issues was
                                                        not being saved
                                                    </li>
                                                    <li>
                                                        Fixed bug where Jira autocomplete query was not being encoded
                                                        correctly
                                                    </li>
                                                    <li>
                                                        Fixed bug causing internal comment button to not show up on
                                                        service desk issues
                                                    </li>
                                                    <li>Fixed bug preventing creation of Bitbucket issues</li>
                                                    <li>
                                                        Fixed bug where create pull request view kept spinning when no
                                                        repositories were open
                                                    </li>
                                                    <li>
                                                        Fixed issue where Jira issues show in treeview but open a blank
                                                        screen when opened
                                                    </li>
                                                    <li>
                                                        Restrict inline commenting range for Bitbucket Server pull
                                                        requests
                                                    </li>
                                                    <li>Fixed delay when refreshing pull requests treeview</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.5')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Added welcome screen to help new users get up and running</li>
                                                    <li>
                                                        Support using existing branches when starting work on an issue
                                                    </li>
                                                </ul>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed issue that could prevent Windows users from adding
                                                        multiple accounts
                                                    </li>
                                                    <li>
                                                        Allow disabling Jira or Bitbucket features globally and
                                                        re-enabling them at the project level
                                                    </li>
                                                    <li>
                                                        Inline comments on Bitbucket Server pull requests no longer show
                                                        up at the file level
                                                    </li>
                                                    <li>
                                                        Fixed diff view comments not refreshing after adding a new
                                                        comment
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.4')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Fixed issue that resulted in failure to save credentials when
                                                        logging in
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.3')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added tooltip text clarifying that only exact matches are
                                                        allowed on Bitbucket Server when adding reviewers to a pull
                                                        request
                                                    </li>
                                                    <li>
                                                        When available, specific error messages for git operations are
                                                        now presented instead of more general error messages
                                                    </li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>
                                                        Jira issues are now correctly assigned when using start work on
                                                        Jira Server
                                                    </li>
                                                    <li>
                                                        Selecting an item from the mention picker when editing a
                                                        Bitbucket issue now works correctly
                                                    </li>
                                                    <li>
                                                        "Create in browser..." button on "Create pull request" screen
                                                        now links to correct location on Bitbucket Server
                                                    </li>
                                                    <li>
                                                        Fixed bug that could prevent Jira issues from presenting
                                                        up-to-date information
                                                    </li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.2')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Allow extension to be used when working in remote workspaces
                                                    </li>
                                                    <li>
                                                        Support for adding internal comments on Jira Service Desk issues
                                                    </li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Jira issue status was empty in some cases</li>
                                                    <li>
                                                        Jira issues showed duplicate transition states in some cases
                                                    </li>
                                                    <li>
                                                        Adding reviewers on Bitbucket Cloud pull requests would show an
                                                        error
                                                    </li>
                                                    <li>Code blocks in inline comments were not formatted correctly</li>
                                                    <li>Bitbucket issue creation was failing</li>
                                                    <li>Bitbucket issue sidebar styling was inconsistent</li>
                                                    <li>Fixed copy for creating pull request externally</li>
                                                    <li>Fixed link to prepare-commit-message snippet</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Added support for tunneling https when using a proxy server</li>
                                                    <li>Now using a reasonable placeholder for broken images</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Jira issue screen broken due to missing priority field</li>
                                                    <li>Jira issue screen broken due to missing subtasks field</li>
                                                    <li>
                                                        Bitbucket repos not recognized if remote URL includes a port
                                                    </li>
                                                    <li>Bitbucket start work on issue not working</li>
                                                    <li>Code block in comments too dark to see in dark themes</li>
                                                    <li>Pipelines explorer filters not working properly</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.1.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Clicking on a pull request preview file now opens the file</li>
                                                    <li>Added advanced SSL options to custom login screen</li>
                                                    <li>Added context path option to custom login screen</li>
                                                    <li>Now showing PR approval status in explorer tooltip</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Bitbucket pull request filters not working</li>
                                                    <li>Sometimes issue screen would be blank</li>
                                                    <li>Online/Offline checker sometimes gave wrong results</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.0.4')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Some Jira fields not populating due to invalid field keys</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.0.3')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Removed the file changes count limit for pull requests</li>
                                                    <li>Webview tabs now have an Atlassian icon</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Create Issue page not loading in some instances</li>
                                                    <li>Webviews didn't allow images to load over http</li>
                                                    <li>
                                                        Various undefined values would throw errors due to lack of
                                                        boundry checking
                                                    </li>
                                                    <li>Doc links fixed and various spelling corrections</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.0.1')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>
                                                        Added support for plain http when connecting to server instances
                                                    </li>
                                                    <li>
                                                        Added experimental support for self-signed certificates see:{' '}
                                                        <a href="https://bitbucket.org/atlassianlabs/atlascode/issues/201">
                                                            Issue #201
                                                        </a>
                                                    </li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Fixed Bitbucket authentication not working</li>
                                                </ul>
                                            </section>
                                            <h3>{l10n.t("{0} What's New in {1} {0}", '🎉', '2.0.0')}</h3>
                                            <section>
                                                <h4>{l10n.t('{0} Improvements {0}', '✨')}</h4>
                                                <ul>
                                                    <li>Support for Jira Server and Bitbucket Server</li>
                                                    <li>
                                                        Support for a wider range of Jira features and configurations
                                                    </li>
                                                    <ul>
                                                        <li>Time tracking</li>
                                                        <li>Adding sprints to issues</li>
                                                        <li>Not having a resolution field</li>
                                                        <li>And more!</li>
                                                    </ul>
                                                    <li>View JQL from multiple sites at once in Jira explorer</li>
                                                    <li>Improved Settings</li>
                                                    <ul>
                                                        <li>
                                                            Jira and Bitbucket now have their own sections in the
                                                            settings
                                                        </li>
                                                        <li>
                                                            Jira or Bitbucket features can now be completely disabled
                                                        </li>
                                                        <li>
                                                            Settings can now be saved at either the user level or the
                                                            workspace level
                                                        </li>
                                                    </ul>
                                                    <li>
                                                        Notifications can be managed and disabled for individual JQL
                                                        queries
                                                    </li>
                                                    <li>Can now collapse all comments on a pull request</li>
                                                    <li>
                                                        Selected code will now be included in description when creating
                                                        issue from a TODO
                                                    </li>
                                                    <li>Get the latest information by refreshing any webview</li>
                                                    <li>
                                                        Improved performance when creating pull requests or starting
                                                        work on issues
                                                    </li>
                                                    <li>Easily edit the branch name when starting work on an issue</li>
                                                    <li>
                                                        Pre-filled mention picker when creating pull requests and
                                                        Bitbucket issues
                                                    </li>
                                                    <li>Editing and deleting comments in pull requests</li>
                                                    <li>Added support for merge commit messages</li>
                                                    <li>Added diff preview in pull request views</li>
                                                    <li>Added support for Bitbucket mirrors</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <h4>{l10n.t('{0} Bugs Fixed {0}', '🐞')}</h4>
                                                <ul>
                                                    <li>Build statuses now link to the tool that created them</li>
                                                    <li>Fixed URL creation on Windows</li>
                                                    <li>
                                                        <code>TODO</code> triggers no longer require a trailing space
                                                    </li>
                                                    <li>Subtasks now report the correct status</li>
                                                    <li>
                                                        Pipelines builds triggered manually or by tag creation now show
                                                        up in the pipelines side bar
                                                    </li>
                                                    <li>
                                                        Username was not slugified when making calls during Bitbucket
                                                        server auth flow
                                                    </li>
                                                    <li>Sometimes webviews would not load data</li>
                                                    <li>
                                                        Transitions are now reloaded when an issue is transitioned to
                                                        get any new available options
                                                    </li>
                                                    <li>Fixed bad default JQL in settings.json</li>
                                                    <li>Fixed error when checking for an empty user object</li>
                                                    <li>Fixed issue with credentials not saving for all sites</li>
                                                </ul>
                                            </section>
                                            <section>
                                                <Link href="https://bitbucket.org/atlassianlabs/atlascode/src/main/CHANGELOG.md">
                                                    {l10n.t('Previous changelog')}
                                                </Link>
                                            </section>
                                            <section>
                                                <h2>{l10n.t('Feedback')}</h2>
                                                <p>
                                                    {l10n.t('We can only make this extension better with your help!')}
                                                </p>
                                                <p>
                                                    {l10n.t(
                                                        "Make sure to let us know how we're doing by using the feedback buttons available on this screen and the configuration screen.",
                                                    )}
                                                </p>
                                            </section>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={3} md={3} lg={3} xl={3}>
                            <Paper className={classes.paperOverflow}>
                                <Box margin={1}>
                                    <Grid container direction="column" alignItems="center">
                                        <Grid item>
                                            <Grid container spacing={2} direction="column" alignItems="flex-start">
                                                <Grid item>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={controller.openSettings}
                                                    >
                                                        Configure settings
                                                    </Button>
                                                </Grid>
                                                <Grid item>
                                                    <FeedbackDialogButton
                                                        user={state.feedbackUser}
                                                        postMessageFunc={controller.postMessage}
                                                    />
                                                </Grid>
                                                <Grid item>
                                                    <IconLink
                                                        href="#"
                                                        onClick={() => controller.openLink(KnownLinkID.AtlascodeRepo)}
                                                        startIcon={<BitbucketIcon />}
                                                    >
                                                        Source Code
                                                    </IconLink>
                                                </Grid>
                                                <Grid item>
                                                    <IconLink
                                                        href="#"
                                                        onClick={() => controller.openLink(KnownLinkID.AtlascodeIssues)}
                                                        startIcon={<BitbucketIcon />}
                                                    >
                                                        Got Issues?
                                                    </IconLink>
                                                </Grid>
                                                <Grid item>
                                                    <IconLink
                                                        href="#"
                                                        onClick={() => controller.openLink(KnownLinkID.AtlascodeDocs)}
                                                        startIcon={<BitbucketIcon />}
                                                    >
                                                        User Guide
                                                    </IconLink>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </WelcomeControllerContext.Provider>
    );
};

export default WelcomePage;
