import { Disposable, Event, EventEmitter, Memento } from 'vscode';
import {
    AuthInfoEvent,
    DetailedSiteInfo,
    emptySiteInfo,
    isRemoveAuthEvent,
    isUpdateAuthEvent,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from './atlclients/authInfo';
import { CredentialManager } from './atlclients/authStore';
import { configuration } from './config/configuration';
import { Container } from './container';

export type SitesAvailableUpdateEvent = {
    sites: DetailedSiteInfo[];
    newSites?: DetailedSiteInfo[];
    product: Product;
};

const SitesSuffix: string = 'Sites';

export class SiteManager extends Disposable {
    private _disposable: Disposable;
    private _sitesAvailable: Map<string, DetailedSiteInfo[]>;
    private _globalStore: Memento;

    private _onDidSitesAvailableChange = new EventEmitter<SitesAvailableUpdateEvent>();
    public get onDidSitesAvailableChange(): Event<SitesAvailableUpdateEvent> {
        return this._onDidSitesAvailableChange.event;
    }

    constructor(globalStore: Memento) {
        super(() => this.dispose());

        this._globalStore = globalStore;
        this._sitesAvailable = new Map<string, DetailedSiteInfo[]>();
        this._sitesAvailable.set(ProductJira.key, []);
        this._sitesAvailable.set(ProductBitbucket.key, []);

        this._disposable = Disposable.from(Container.credentialManager.onDidAuthChange(this.onDidAuthChange, this));
    }

    dispose() {
        this._disposable.dispose();
        this._onDidSitesAvailableChange.dispose();
    }

    public addOrUpdateSite(newSite: DetailedSiteInfo) {
        const allSites = this.readSitesFromGlobalStore(newSite.product.key);
        const oldSite = allSites?.find((site) => site.id === newSite.id && site.userId === newSite.userId);
        if (oldSite) {
            this.updateSite(oldSite, newSite);
        } else {
            this.addSites([newSite]);
        }
    }

    public addSites(newSites: DetailedSiteInfo[]) {
        if (newSites.length === 0) {
            return;
        }

        const productKey = newSites[0].product.key;
        let notify = true;
        let allSites = this.readSitesFromGlobalStore(productKey);
        if (allSites) {
            // Ensure all cloud sites use the per account credential ID
            allSites.forEach((site) => {
                if (site.isCloud) {
                    site.credentialId = CredentialManager.generateCredentialId(site.product.key, site.userId);
                }
            });

            newSites = newSites.filter((s) => !allSites!.some((s2) => s2.id === s.id && s2.userId === s.userId));
            if (newSites.length === 0) {
                notify = false;
            }
            allSites = allSites.concat(newSites);
        } else {
            allSites = newSites;
        }

        this._globalStore.update(`${productKey}${SitesSuffix}`, allSites);
        this._sitesAvailable.set(productKey, allSites);

        if (notify) {
            this._onDidSitesAvailableChange.fire({
                sites: allSites,
                newSites: newSites,
                product: allSites[0].product,
            });
        }
    }

    public updateSite(oldSite: DetailedSiteInfo, newSite: DetailedSiteInfo) {
        const allSites = this.readSitesFromGlobalStore(newSite.product.key);
        if (allSites) {
            const oldSiteIndex = allSites.findIndex((site) => site.id === oldSite.id && site.userId === oldSite.userId);
            if (oldSiteIndex !== -1) {
                allSites.splice(oldSiteIndex, 1, newSite);

                this._globalStore.update(`${newSite.product.key}${SitesSuffix}`, allSites);
                this._sitesAvailable.set(newSite.product.key, allSites);
                this._onDidSitesAvailableChange.fire({ sites: [newSite], product: newSite.product });
            }
        }
    }

    onDidAuthChange(e: AuthInfoEvent) {
        if (isRemoveAuthEvent(e)) {
            const deadSites = this.getSitesAvailable(e.product).filter((site) => site.credentialId === e.credentialId);
            deadSites.forEach((s) => this.removeSite(s));
            if (deadSites.length > 0) {
                this._onDidSitesAvailableChange.fire({
                    sites: this.getSitesAvailable(e.product),
                    product: e.product,
                });
            }
        } else if (isUpdateAuthEvent(e)) {
            this._onDidSitesAvailableChange.fire({
                sites: this.getSitesAvailable(e.site.product),
                product: e.site.product,
            });
        }
    }

    public getSitesAvailable(product: Product): DetailedSiteInfo[] {
        return this.getSitesAvailableForKey(product.key);
    }

    private readSitesFromGlobalStore(productKey: string) {
        const sites = this._globalStore.get<any[]>(`${productKey}${SitesSuffix}`);
        return sites?.map((s) => this.readSite(s));
    }

    private readSite(site: any): DetailedSiteInfo {
        // We had saved just the hostname originally, but started including the port for server
        // customers so it's now technically a host. Since this is persisted there will be some
        // saved instances that still refer to it as hostname so we apply this correction here.
        if (!site.host && site.hostname) {
            site.host = site.hostname;
        }
        delete site.hostname;
        return site;
    }

    private getSitesAvailableForKey(productKey: string): DetailedSiteInfo[] {
        let sites = this._sitesAvailable.get(productKey);

        if (!sites || sites.length < 1) {
            sites = this.readSitesFromGlobalStore(productKey);
            if (!sites) {
                sites = [];
            }

            this._sitesAvailable.set(productKey, sites);
        }

        return sites;
    }

    public getFirstSite(productKey: string): DetailedSiteInfo {
        const sites: DetailedSiteInfo[] = this.getSitesAvailableForKey(productKey);

        if (sites.length > 0) {
            return sites[0];
        }
        return emptySiteInfo;
    }

    public getFirstAAID(productKey?: string): string | undefined {
        if (productKey) {
            return this.getFirstAAIDForProduct(productKey);
        }
        const userId = this.getFirstAAIDForProduct(ProductJira.key);
        if (userId) {
            return userId;
        }
        return this.getFirstAAIDForProduct(ProductBitbucket.key);
    }

    private getFirstAAIDForProduct(productKey: string): string | undefined {
        const sites = this.getSitesAvailableForKey(productKey);
        const cloudSites = sites.filter((s) => s.isCloud);
        if (cloudSites.length > 0) {
            return cloudSites[0].userId;
        }

        return undefined;
    }

    public productHasAtLeastOneSite(product: Product): boolean {
        return this.getSitesAvailable(product).length > 0;
    }

    public getSiteForHostname(product: Product, hostname: string): DetailedSiteInfo | undefined {
        // match for complete hostname
        let site = this.getSitesAvailable(product).find((site) => site.host.includes(hostname));
        if (site) {
            return site;
        }

        // partial suffix match for hostname to support cases where git clone URL hostname is different from REST API hostname
        // e.g. if hostname if abc.example.com, look for example.com
        const hostnameComponents = hostname.split('.');
        const domain = hostnameComponents.slice(hostnameComponents.length - 2).join('.');
        site = this.getSitesAvailable(product).find((site) => site.host.includes(domain));
        if (site) {
            return site;
        }

        // look for match in mirror hosts (for Bitbucket Server)
        site = this.getSitesAvailable(product).find((site) =>
            Container.bitbucketContext
                ? Container.bitbucketContext.getMirrors(site.host).find((mirror) => mirror.includes(hostname)) !==
                  undefined
                : false,
        );
        if (site) {
            return site;
        }

        return this.getSitesAvailable(product).find((site) =>
            Container.bitbucketContext
                ? Container.bitbucketContext.getMirrors(site.host).find((mirror) => mirror.includes(domain)) !==
                  undefined
                : false,
        );
    }

    public getSiteForId(product: Product, id: string): DetailedSiteInfo | undefined {
        return this.getSitesAvailable(product).find((site) => site.id === id);
    }

    public removeSite(site: SiteInfo): boolean {
        const sites = this.readSitesFromGlobalStore(site.product.key);
        if (sites && sites.length > 0) {
            const foundIndex = sites.findIndex((availableSite) => availableSite.host === site.host);
            if (foundIndex > -1) {
                const deletedSite = sites[foundIndex];
                sites.splice(foundIndex, 1);
                this._globalStore.update(`${site.product.key}${SitesSuffix}`, sites);
                this._sitesAvailable.set(site.product.key, sites);
                this._onDidSitesAvailableChange.fire({ sites: sites, product: site.product });
                Container.credentialManager.removeAuthInfo(deletedSite);

                if (deletedSite.id === Container.config.jira.lastCreateSiteAndProject.siteId) {
                    configuration.setLastCreateSiteAndProject(undefined);
                }

                return true;
            }
        }

        return false;
    }
}
