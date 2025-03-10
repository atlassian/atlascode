import {
    isIssueKeyAndSite,
    isMinimalIssue,
    MinimalIssueOrKeyAndSite,
    Transition,
} from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';
import { issueTransitionedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { Container } from '../container';
import { Logger } from '../logger';

export async function transitionIssue(issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>, transition: Transition) {
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
        await performTransition(issueKey, transition, site);
        return;
    } catch (e) {
        Logger.error(e);
        throw e;
    }
}

async function performTransition(issueKey: string, transition: Transition, site: DetailedSiteInfo) {
    try {
        const client = await Container.clientManager.jiraClient(site);
        await client.transitionIssue(issueKey, transition.id);

        vscode.commands.executeCommand(Commands.RefreshJiraExplorer);
        vscode.commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
        vscode.commands.executeCommand(Commands.RefreshCustomJqlExplorer);

        issueTransitionedEvent(site, issueKey).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    } catch (err) {
        Logger.error(err);
        throw err;
    }
}
