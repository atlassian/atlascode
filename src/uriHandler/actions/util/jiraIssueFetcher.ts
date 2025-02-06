import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { Container } from '../../../container';
import { fetchMinimalIssue } from '../../../jira/fetchIssue';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { window } from 'vscode';
import * as vscode from 'vscode';

// Common logic that's shared between multiple actions that deal with Jira issues
export class JiraIssueFetcher {
    // Resolves the site that matches the given siteBaseURL,
    // finds the issue on that site and returns it
    // Throws an error if anything goes wrong
    async fetchIssue(issueKey: string, siteBaseURL: string) {
        const site = this.findMatchingSite(siteBaseURL);
        if (!site) {
            this.handleSiteNotFound(issueKey, siteBaseURL);
            throw new Error(`Could not find auth details for ${siteBaseURL}`);
        }

        const issue = await this.findIssueOnSite(issueKey, site);
        if (!issue) {
            throw new Error(`Could not fetch issue: ${issueKey}`);
        }

        return issue;
    }

    async findIssueOnSite(issueKey: string, site: DetailedSiteInfo) {
        let foundIssue = await Container.jiraExplorer.findIssue(issueKey);
        if (foundIssue) {
            return await fetchMinimalIssue(issueKey, site);
        }

        return undefined;
    }

    async handleSiteNotFound(issueKey: string, siteBaseURL: string) {
        const choice = vscode.l10n.t('Open auth settings');
        await window
            .showInformationMessage(
                vscode.l10n.t(
                    "Cannot open {0} because site '{1}' is not authenticated. Please authenticate and try again.",
                    issueKey,
                    siteBaseURL,
                ),
                choice,
            )
            .then((userChoice) => {
                if (userChoice === choice) {
                    Container.settingsWebviewFactory.createOrShow({
                        section: ConfigSection.Jira,
                        subSection: ConfigSubSection.Auth,
                    });
                }
            });
    }

    findMatchingSite(siteBaseURL: string): DetailedSiteInfo | undefined {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        return jiraSitesAvailable.find(
            (availableSite) => availableSite.isCloud && availableSite.baseLinkUrl.includes(siteBaseURL),
        );
    }
}
