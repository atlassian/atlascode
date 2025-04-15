import PQueue from 'p-queue/dist';
import { ConfigurationChangeEvent, Disposable } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { configuration } from '../config/configuration';
import { JQLEntry } from '../config/model';
import { Container } from '../container';
import { Logger } from '../logger';

export type JQLUpdateEvent = {
    jqlEntries: JQLEntry[];
};

export class JQLManager extends Disposable {
    private _disposable: Disposable;
    private _queue = new PQueue({ concurrency: 1 });

    // In this PR: https://github.com/atlassian/atlascode/pull/169
    // we have introduced a new field in DetailedSiteInfo that is populated at auth time.
    // For those who already have this data saved before the introduction of the new logic,
    // we need to backfill this field to avoid constructing a wrong default JQL query.
    public static async backFillOldDetailedSiteInfos(): Promise<void> {
        for (const site of Container.siteManager.getSitesAvailable(ProductJira)) {
            try {
                await JQLManager.backFillOldDetailedSiteInfo(site);
            } catch (error) {
                Logger.error(error, `Error backfilling site ${site.id}`);
            }
        }
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(configuration.onDidChange(this.onConfigurationChanged, this));
    }

    private static async backFillOldDetailedSiteInfo(site: DetailedSiteInfo) {
        if (site.hasResolutionField === undefined) {
            const client = await Container.clientManager.jiraClient(site);
            const fields = await client.getFields();
            site.hasResolutionField = fields.some((f) => f.id === 'resolution');

            Container.siteManager.addOrUpdateSite(site);
        }
    }

    dispose() {
        this._disposable.dispose();
    }

    public async updateFilters() {
        this._queue.add(async () => {
            const allList = Container.config.jira.jqlList;
            if (!allList) {
                return;
            }

            const filterList = allList.filter((item) => item.filterId);

            await Promise.all(
                filterList.map(async (f) => {
                    const site = Container.siteManager.getSiteForId(ProductJira, f.siteId);
                    if (site) {
                        try {
                            const client = await Container.clientManager.jiraClient(site);
                            const updatedFilter = await client.getFilter(f.filterId!);
                            if (updatedFilter) {
                                const originalFilter = allList.find((of) => of.id === f.id);
                                if (originalFilter) {
                                    originalFilter.name = updatedFilter.name;
                                    originalFilter.query = updatedFilter.jql;
                                }
                            }
                        } catch (e) {
                            Logger.error(e, `Error fetching filter "${f.name}"`);
                        }
                    }
                }),
            );

            configuration.updateEffective('jira.jqlList', allList);
        });
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

    public async removeJQLForSiteWithId(siteId: string) {
        this._queue.add(async () => {
            let allList = Container.config.jira.jqlList;

            allList = allList.filter((j) => j.siteId !== siteId);

            await configuration.updateEffective('jira.jqlList', allList);
        });
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'jira.filterList')) {
            this.updateFilters();
        }
    }
}
