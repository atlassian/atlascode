import PQueue from 'p-queue/dist';
import { v4 } from 'uuid';
import { ConfigurationChangeEvent, ConfigurationTarget, Disposable, Event, EventEmitter } from 'vscode';
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

    private _onDidJQLChange = new EventEmitter<JQLUpdateEvent>();
    public get onDidJQLChange(): Event<JQLUpdateEvent> {
        return this._onDidJQLChange.event;
    }

    // In this PR: https://github.com/atlassian/atlascode/pull/169
    // we have introduced a new field in DetailedSiteInfo that is populated at auth time.
    // For those who already have this data saved before the introduction of the new logic,
    // we need to backfill this field to avoid constructing a wrong default JQL query.
    public static async backFillOldDetailedSiteInfo(): Promise<void> {
        for (const site of Container.siteManager.getSitesAvailable(ProductJira)) {
            if (site.hasResolutionField === undefined) {
                const client = await Container.clientManager.jiraClient(site);
                const fields = await client.getFields();
                site.hasResolutionField = fields.some((f) => f.id === 'resolution');

                Container.siteManager.addOrUpdateSite(site);
            }
        }
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(configuration.onDidChange(this.onConfigurationChanged, this));
    }

    dispose() {
        this._disposable.dispose();
        this._onDidJQLChange.dispose();
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
        return sites.map((site) => this.defaultJQLEntryForSite(site, () => site.id));
    }

    public getCustomJQLEntries(): JQLEntry[] {
        const enabledEntries = this.enabledJQLEntries();
        return enabledEntries.filter((entry) => {
            const site = Container.siteManager.getSiteForId(ProductJira, entry.siteId);
            return site && entry.query !== this.defaultJQLQueryForSite(site);
        });
    }

    public async initializeJQL(sites: DetailedSiteInfo[]) {
        this._queue.add(async () => {
            const allList = Container.config.jira.jqlList;

            for (const site of sites) {
                if (!allList.some((j) => j.siteId === site.id)) {
                    // only initialize if there are no jql entries for this site
                    allList.push(this.defaultJQLEntryForSite(site, v4));
                }
            }

            await configuration.update('jira.jqlList', allList, ConfigurationTarget.Global);
        });
    }

    private defaultJQLQueryForSite(site: DetailedSiteInfo): string {
        return site.hasResolutionField
            ? 'assignee = currentUser() AND resolution = Unresolved ORDER BY lastViewed DESC'
            : 'assignee = currentUser() ORDER BY lastViewed DESC';
    }

    private defaultJQLEntryForSite(site: DetailedSiteInfo, idFunc: () => string): JQLEntry {
        return {
            id: idFunc(),
            enabled: true,
            name: `My ${site.name} Issues`,
            query: this.defaultJQLQueryForSite(site),
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
