import {
    isIssueKeyAndSite,
    isMinimalIssue,
    MinimalIssueOrKeyAndSite,
    Transition,
} from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';

import { issueTransitionedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';
import { Commands } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { OnJiraEditedRefreshDelay } from '../util/time';

export async function transitionIssue(
    issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>,
    transition: Transition,
    analyticsData?: {
        source: string;
    },
) {
    let issueKey: string = '';
    let site: DetailedSiteInfo = emptySiteInfo;

    if (isMinimalIssue(issueOrKey)) {
        issueKey = issueOrKey.key;
        site = issueOrKey.siteDetails;
    } else if (isIssueKeyAndSite(issueOrKey)) {
        issueKey = issueOrKey.key;
        site = issueOrKey.siteDetails;
    } else {
        throw new Error('invalid issue or key');
    }

    try {
        await performTransition(issueKey, transition, site, analyticsData);
        return;
    } catch (e) {
        Logger.error(e, 'Error executing transitionIssue');
        throw e;
    }
}

async function performTransition(
    issueKey: string,
    transition: Transition,
    site: DetailedSiteInfo,
    analyticsData?: {
        source: string;
    },
) {
    try {
        const client = await Container.clientManager.jiraClient(site);
        await client.transitionIssue(issueKey, transition.id);

        vscode.commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer, OnJiraEditedRefreshDelay);
        vscode.commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);

        issueTransitionedEvent(site, issueKey, analyticsData?.source).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    } catch (err) {
        Logger.error(err, 'Error executing performTransition');
        throw err;
    }
}
