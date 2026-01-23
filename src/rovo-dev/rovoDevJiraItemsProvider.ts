import { Logger } from 'src/logger';
import { Disposable, Event, EventEmitter } from 'vscode';

import { DetailedSiteInfo, ExtensionApi, MinimalIssue } from './api/extensionApi';

export class RovoDevJiraItemsProvider extends Disposable {
    private extensionApi = new ExtensionApi();
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
        // if the site hasn't changed, do nothing
        if (this.jiraSiteHostname) {
            if (typeof jiraSiteHostname === 'object') {
                if (this.jiraSiteHostname === jiraSiteHostname) {
                    return;
                }
            } else if (this.jiraSiteHostname.host === jiraSiteHostname) {
                return;
            }
        }

        this.stop();
        this._onNewJiraItems.fire(undefined);

        this.jiraSiteHostname = undefined;

        if (typeof jiraSiteHostname === 'object') {
            this.jiraSiteHostname = jiraSiteHostname;
        } else if (typeof jiraSiteHostname === 'string') {
            const sites = this.extensionApi.jira.getSites();
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

        try {
            // Filter to only include MinimalIssue items (not IssueLinkIssue)
            const assignedIssuesForSite = await this.extensionApi.jira.fetchWorkItems(this.jiraSiteHostname);

            const filteredIssues = assignedIssuesForSite.filter(
                (issue) => issue.status?.statusCategory?.name.toLowerCase() === 'to do',
            );

            this.pollTimer = setTimeout(() => this.checkForIssues(), 60000);
            this._onNewJiraItems.fire(filteredIssues.slice(0, 3));
        } catch (error) {
            // If fetching work items fails (e.g., due to scoped API token limitations),
            // fire an empty array to hide the entire Jira work items section
            Logger.error(error, 'Failed to fetch Jira work items:' + error.message);
            this._onNewJiraItems.fire([]);
        }
    }
}
