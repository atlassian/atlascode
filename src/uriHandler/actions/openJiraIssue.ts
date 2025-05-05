import { IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { Uri, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { ConfigSection, ConfigSubSection } from '../../lib/ipc/models/config';
import { Logger } from '../../logger';
import { BasicUriHandler } from './basicUriHandler';

/**
 * Use a deep link to open pull request
 *
 * Expected link:
 * `vscode://atlassian.atlascode/openJiraIssue?key=...&site=...&[&source=...]`
 *
 * Query params:
 * - `key`: the Jira issue's key, like `PROJ-123`
 * - `site`: the site's host name where the Jira issue is hosted, like `site.atlassian.net`
 * - `source`: (optional) the source of the deep link
 */
export class OpenJiraIssueUriHandler extends BasicUriHandler {
    constructor() {
        super('openJiraIssue', (uri) => this.customHandle(uri));
    }

    private async customHandle(uri: Uri): Promise<void> {
        const query = new URLSearchParams(uri.query);
        const issueKey = decodeURIComponent(query.get('key') || '');
        const siteHost = decodeURIComponent(query.get('site') || '');

        if (!issueKey || !siteHost) {
            throw new Error(`Cannot parse ${this.suffix} URL from: ${query}`);
        }

        const siteDetails = this.findSite(siteHost);
        if (!siteDetails) {
            await this.handleSiteNotFound(issueKey, siteHost);
            return;
        }

        try {
            const keyAndSite: IssueKeyAndSite<DetailedSiteInfo> = { key: issueKey, siteDetails };
            await showIssue(keyAndSite);
        } catch (e) {
            Logger.debug(`Error opening jira issue ${issueKey}:`, e);
            window.showErrorMessage(`Error opening jira issue ${issueKey} (check log for details)`);
            throw e;
        }
    }

    private findSite(siteHost: string): DetailedSiteInfo | undefined {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        return jiraSitesAvailable.find((availableSite) => availableSite.host === siteHost);
    }

    private handleSiteNotFound(issueKey: string, siteHost: string) {
        return window
            .showInformationMessage(
                `Cannot open ${issueKey} because site '${siteHost}' is not authenticated. Please authenticate and try again.`,
                'Open auth settings',
            )
            .then((userChoice) => {
                if (userChoice === 'Open auth settings') {
                    Container.settingsWebviewFactory.createOrShow({
                        section: ConfigSection.Jira,
                        subSection: ConfigSubSection.Auth,
                    });
                }
            });
    }
}
