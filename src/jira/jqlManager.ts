import { Disposable } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { JQLEntry } from '../config/model';
import { Container } from '../container';

export type JQLUpdateEvent = {
    jqlEntries: JQLEntry[];
};

export class JQLManager extends Disposable {
    constructor() {
        super(() => {});
    }

    public notifiableJQLEntries(): JQLEntry[] {
        return Container.config.jira.jqlList.filter((entry) => entry.enabled && entry.monitor);
    }

    public enabledJQLEntries(): JQLEntry[] {
        return Container.config.jira.jqlList.filter((entry) => entry.enabled);
    }

    public getAllDefaultJQLEntries(): JQLEntry[] {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        return sites.map((site) => this.defaultJQLEntryForJiraExplorer(site));
    }

    private defaultJQLEntryForJiraExplorer(site: DetailedSiteInfo): JQLEntry {
        return {
            id: site.id, // in Assigned Jira Work Items we only have 1 query per site, so this id works well
            enabled: true,
            name: 'My issues',
            query: 'assignee = currentUser() AND StatusCategory != Done ORDER BY updated DESC',
            siteId: site.id,
            monitor: true,
        };
    }
}
