import { isMinimalIssue, MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { Container } from 'src/container';
import { Disposable, Event, EventEmitter } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';

export class RovoDevJiraItemsProvider extends Disposable {
    private jiraSiteHostname: DetailedSiteInfo | undefined = undefined;
    private pollTimer: NodeJS.Timeout | undefined = undefined;

    private _onNewJiraItems = new EventEmitter<MinimalIssue<DetailedSiteInfo>[] | undefined>();
    public get onNewJiraItems(): Event<MinimalIssue<DetailedSiteInfo>[] | undefined> {
        return this._onNewJiraItems.event;
    }

    constructor() {
        super(() => this.dispose());
    }

    public override dispose() {
        this.stop();
        this._onNewJiraItems.dispose();
    }

    public setJiraSite(jiraSiteHostname: DetailedSiteInfo | string) {
        this.stop();
        this._onNewJiraItems.fire(undefined);

        this.jiraSiteHostname = undefined;

        if (typeof jiraSiteHostname === 'object') {
            this.jiraSiteHostname = jiraSiteHostname;
        } else if (typeof jiraSiteHostname === 'string') {
            const sites = Container.siteManager.getSitesAvailable(ProductJira);
            for (const site of sites) {
                if (site.host === jiraSiteHostname) {
                    this.jiraSiteHostname = site;
                    break;
                }
            }
        }

        this.start();
    }

    private start() {
        this.stop();

        if (this.jiraSiteHostname && !this.pollTimer) {
            this.checkForIssues();
        }
    }

    private stop() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = undefined;
        }
    }

    private async checkForIssues(): Promise<void> {
        if (!this.jiraSiteHostname) {
            return;
        }

        // Filter to only include MinimalIssue items (not IssueLinkIssue)
        let assignedIssuesForSite = this.fetchJiraIssuesFromCache(this.jiraSiteHostname);
        if (assignedIssuesForSite) {
            assignedIssuesForSite = await this.fetchJiraIssuesFromAPI(this.jiraSiteHostname);
        }

        const filteredIssues = assignedIssuesForSite.filter(
            (issue) => issue.status?.statusCategory?.name.toLowerCase() === 'to do',
        );

        this.pollTimer = setTimeout(() => this.checkForIssues(), 60000);
        this._onNewJiraItems.fire(filteredIssues.slice(0, 3));
    }

    private fetchJiraIssuesFromCache(site: DetailedSiteInfo) {
        const issues = SearchJiraHelper.getAssignedIssuesPerSite(site.id);
        return issues.filter((issue) => isMinimalIssue(issue));
    }

    private async fetchJiraIssuesFromAPI(site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const jql = 'assignee = currentUser() AND StatusCategory = "To Do" ORDER BY updated DESC';

        const client = await Container.clientManager.jiraClient(site);
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
        const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicFieldInfo);

        const res = await client.searchForIssuesUsingJqlGet(jql, fields, 30, 0);
        const searchResults = await readSearchResults(res, site, epicFieldInfo);
        return searchResults.issues.filter((issue) => isMinimalIssue(issue));
    }
}
