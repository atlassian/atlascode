import { SiteManager } from 'src/siteManager';
import { expansionCastTo } from 'testsutil';
import { EventEmitter, Memento } from 'vscode';

import {
    AuthChangeType,
    AuthInfoEvent,
    DetailedSiteInfo,
    Product,
    ProductBitbucket,
    ProductJira,
    RemoveAuthInfoEvent,
    UpdateAuthInfoEvent,
} from './atlclients/authInfo';
import { CredentialManager } from './atlclients/authStore';
import { configuration } from './config/configuration';
import { Container } from './container';

describe('SiteManager', () => {
    let siteManager: SiteManager;
    let siteManager_resolvePrimarySite: () => void;
    let mockGlobalStore: Memento;
    let mockAuthChangeEmitter: EventEmitter<AuthInfoEvent>;
    let mockCredentialManager: CredentialManager;
    let mockContainer: typeof Container;
    let storedSites: Map<string, DetailedSiteInfo[]>;

    const mockMemento = () =>
        expansionCastTo<Memento>({
            get: jest.fn((key: string) => storedSites.get(key)),
            update: jest.fn((key: string, value: any) => {
                storedSites.set(key, value);
                return Promise.resolve();
            }),
        });

    const createDetailedSiteInfo = (
        product: Product,
        id: string = 'site1',
        userId: string = 'user1',
        isCloud: boolean = false,
    ): DetailedSiteInfo =>
        expansionCastTo<DetailedSiteInfo>({
            id,
            userId,
            product,
            isCloud,
            host: `https://${id}.example.com`,
            name: `Site ${id}`,
            credentialId: isCloud
                ? CredentialManager.generateCredentialId(product.key, userId)
                : `${product.key}-${id}`,
            avatarUrl: '',
            baseApiUrl: 'https://www.atlassian.net',
            baseLinkUrl: 'https://www.atlassian.net',
        });

    beforeEach(() => {
        storedSites = new Map();
        mockGlobalStore = mockMemento();
        mockAuthChangeEmitter = new EventEmitter<AuthInfoEvent>();
        mockCredentialManager = {
            onDidAuthChange: jest.fn(() => mockAuthChangeEmitter.event),
            getAuthInfo: jest.fn(),
            removeAuthInfo: jest.fn(),
            generateCredentialId: jest.fn(),
        } as unknown as CredentialManager;

        CredentialManager.generateCredentialId = jest.fn((productKey, userId) => `${productKey}-${userId}`);

        // Mock Container
        mockContainer = {
            credentialManager: mockCredentialManager,
            bitbucketContext: {
                getMirrors: jest.fn((host) => []),
            },
            config: {
                jira: {
                    lastCreateSiteAndProject: {
                        siteId: 'site1',
                    },
                },
            },
        } as unknown as typeof Container;

        // Replace the real Container with our mock
        jest.spyOn(Container, 'credentialManager', 'get').mockReturnValue(mockCredentialManager);
        jest.spyOn(Container, 'bitbucketContext', 'get').mockReturnValue(mockContainer.bitbucketContext);
        jest.spyOn(Container, 'config', 'get').mockReturnValue(mockContainer.config);

        // Create a SiteManager instance
        siteManager = new SiteManager(mockGlobalStore);
        siteManager_resolvePrimarySite = () => siteManager['resolvePrimarySite']();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize sitesAvailable with empty arrays for Jira and Bitbucket', () => {
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual([]);
            expect(siteManager.getSitesAvailable(ProductBitbucket)).toEqual([]);
        });
    });

    describe('addSites', () => {
        it('should add sites to empty state', () => {
            const newSites = [createDetailedSiteInfo(ProductJira)];

            siteManager.addSites(newSites);

            expect(mockGlobalStore.update).toHaveBeenCalledWith(`${ProductJira.key}Sites`, newSites);
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual(newSites);
        });

        it('should add sites to existing site collection', () => {
            const existingSite = createDetailedSiteInfo(ProductJira, 'site1');
            const newSite = createDetailedSiteInfo(ProductJira, 'site2');

            storedSites.set(`${ProductJira.key}Sites`, [existingSite]);

            siteManager.addSites([newSite]);

            expect(mockGlobalStore.update).toHaveBeenCalledWith(`${ProductJira.key}Sites`, [existingSite, newSite]);
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual([existingSite, newSite]);
        });

        it('should not add duplicate sites', () => {
            const site = createDetailedSiteInfo(ProductJira);

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            siteManager.addSites([site]);

            expect(mockGlobalStore.update).toHaveBeenCalledWith(`${ProductJira.key}Sites`, [site]);
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual([site]);
        });

        it('should ensure cloud sites use the per account credential ID', () => {
            const cloudSite = createDetailedSiteInfo(ProductJira, 'cloud', 'user1', true);
            cloudSite.credentialId = 'old-id'; // Set wrong ID to test correction

            storedSites.set(`${ProductJira.key}Sites`, [cloudSite]);

            const newSite = createDetailedSiteInfo(ProductJira, 'site2');
            siteManager.addSites([newSite]);

            const updatedSites = siteManager.getSitesAvailable(ProductJira);
            expect(updatedSites[0].credentialId).toBe(`${ProductJira.key}-user1`);
            expect(updatedSites).toHaveLength(2);
        });
    });

    describe('updateSite', () => {
        it('should update an existing site', () => {
            const oldSite = createDetailedSiteInfo(ProductJira);
            const newSite = { ...oldSite, name: 'Updated Site' };

            storedSites.set(`${ProductJira.key}Sites`, [oldSite]);

            siteManager.updateSite(oldSite, newSite);

            expect(mockGlobalStore.update).toHaveBeenCalledWith(`${ProductJira.key}Sites`, [newSite]);
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual([newSite]);
        });

        it('should not update if site is not found', () => {
            const site1 = createDetailedSiteInfo(ProductJira, 'site1');
            const site2 = createDetailedSiteInfo(ProductJira, 'site2');

            storedSites.set(`${ProductJira.key}Sites`, [site1]);

            siteManager.updateSite(site2, { ...site2, name: 'Updated' });

            expect(mockGlobalStore.update).not.toHaveBeenCalled();
            expect(siteManager.getSitesAvailable(ProductJira)).toEqual([site1]);
        });
    });

    describe('addOrUpdateSite', () => {
        it('should update an existing site', () => {
            const existingSite = createDetailedSiteInfo(ProductJira);
            const updatedSite = { ...existingSite, name: 'Updated Site' };

            storedSites.set(`${ProductJira.key}Sites`, [existingSite]);

            jest.spyOn(siteManager, 'updateSite');

            siteManager.addOrUpdateSite(updatedSite);

            expect(siteManager.updateSite).toHaveBeenCalledWith(existingSite, updatedSite);
        });

        it('should add a new site if it does not exist', () => {
            const newSite = createDetailedSiteInfo(ProductJira);

            jest.spyOn(siteManager, 'addSites');

            siteManager.addOrUpdateSite(newSite);

            expect(siteManager.addSites).toHaveBeenCalledWith([newSite]);
        });
    });

    describe('onDidAuthChange', () => {
        it('should remove sites when auth is removed', () => {
            const site = createDetailedSiteInfo(ProductJira, 'someId');

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            jest.spyOn(siteManager, 'removeSite').mockImplementation(() => Promise.resolve(true));

            const removeEvent: RemoveAuthInfoEvent = {
                type: AuthChangeType.Remove,
                product: ProductJira,
                credentialId: site.credentialId,
                userId: '',
            };

            siteManager.onDidAuthChange(removeEvent);

            expect(siteManager.removeSite).toHaveBeenCalledWith(site, false, false);
        });

        it('should fire sites available event when auth is updated', () => {
            const site = createDetailedSiteInfo(ProductJira, 'someId');

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            const updateEvent: UpdateAuthInfoEvent = {
                type: AuthChangeType.Update,
                site: site,
            };

            jest.spyOn(siteManager['_onDidSitesAvailableChange'], 'fire');

            siteManager.onDidAuthChange(updateEvent);

            expect(siteManager['_onDidSitesAvailableChange'].fire).toHaveBeenCalledWith({
                sites: [site],
                product: ProductJira,
            });
        });
    });

    describe('removeSite', () => {
        it('should remove a site and clean up related resources', async () => {
            const site = createDetailedSiteInfo(ProductJira, 'site1');

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            jest.spyOn(configuration, 'setLastCreateSiteAndProject');

            const result = await siteManager.removeSite(site);

            expect(result).toBe(true);
            expect(mockGlobalStore.update).toHaveBeenCalledWith(`${ProductJira.key}Sites`, []);
            expect(mockCredentialManager.removeAuthInfo).toHaveBeenCalledWith(site);
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalledWith(undefined);
        });

        it('should return false if site is not found', async () => {
            const site = createDetailedSiteInfo(ProductJira);

            const result = await siteManager.removeSite(site);

            expect(result).toBe(false);
            expect(mockGlobalStore.update).not.toHaveBeenCalled();
            expect(mockCredentialManager.removeAuthInfo).not.toHaveBeenCalled();
        });
    });

    describe('getSiteForHostname', () => {
        it('should find a site by exact hostname match', () => {
            const site = createDetailedSiteInfo(ProductJira);
            site.host = 'https://example.com';

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            const result = siteManager.getSiteForHostname(ProductJira, 'example.com');

            expect(result).toBe(site);
        });

        it('should find a site by partial domain match', () => {
            const site = createDetailedSiteInfo(ProductJira);
            site.host = 'https://example.com';

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            const result = siteManager.getSiteForHostname(ProductJira, 'subdomain.example.com');

            expect(result).toBe(site);
        });

        it('should check mirror hosts for Bitbucket Server', () => {
            const site = createDetailedSiteInfo(ProductBitbucket);
            site.host = 'https://bitbucket.example.com';

            storedSites.set(`${ProductBitbucket.key}Sites`, [site]);

            // Mock the getMirrors function to return mirrors
            (Container.bitbucketContext!.getMirrors as jest.Mock).mockReturnValue(['mirror.example.com']);

            const result = siteManager.getSiteForHostname(ProductBitbucket, 'mirror.example.com');

            expect(result).toBe(site);
        });
    });

    describe('getFirstAAID', () => {
        it('should return the first cloud site user ID for a given product', () => {
            const cloudSite = createDetailedSiteInfo(ProductJira, 'cloud', 'cloud-user', true);
            const serverSite = createDetailedSiteInfo(ProductJira, 'server', 'server-user', false);

            storedSites.set(`${ProductJira.key}Sites`, [serverSite, cloudSite]);

            const result = siteManager.getFirstAAID(ProductJira.key);

            expect(result).toBe('cloud-user');
        });

        it('should try Jira first, then Bitbucket if no product is specified', () => {
            const jiraCloudSite = createDetailedSiteInfo(ProductJira, 'jira-cloud', 'jira-user', true);
            const bitbucketCloudSite = createDetailedSiteInfo(ProductBitbucket, 'bb-cloud', 'bb-user', true);

            storedSites.set(`${ProductJira.key}Sites`, [jiraCloudSite]);
            storedSites.set(`${ProductBitbucket.key}Sites`, [bitbucketCloudSite]);

            const result = siteManager.getFirstAAID();

            expect(result).toBe('jira-user');
        });

        it('should return undefined if no cloud sites exist', () => {
            const serverSite = createDetailedSiteInfo(ProductJira, 'server', 'server-user', false);

            storedSites.set(`${ProductJira.key}Sites`, [serverSite]);

            const result = siteManager.getFirstAAID(ProductJira.key);

            expect(result).toBeUndefined();
        });
    });

    describe('productHasAtLeastOneSite', () => {
        it('should return true if sites exist for the product', () => {
            const site = createDetailedSiteInfo(ProductJira);

            storedSites.set(`${ProductJira.key}Sites`, [site]);

            expect(siteManager.productHasAtLeastOneSite(ProductJira)).toBe(true);
        });

        it('should return false if no sites exist for the product', () => {
            expect(siteManager.productHasAtLeastOneSite(ProductJira)).toBe(false);
        });
    });

    describe('getFirstSite', () => {
        it('should return the first site for a product', () => {
            const site1 = createDetailedSiteInfo(ProductJira, 'site1');
            const site2 = createDetailedSiteInfo(ProductJira, 'site2');

            storedSites.set(`${ProductJira.key}Sites`, [site1, site2]);

            const result = siteManager.getFirstSite(ProductJira.key);

            expect(result).toBe(site1);
        });

        it('should return emptySiteInfo if no sites exist', () => {
            const result = siteManager.getFirstSite(ProductJira.key);

            expect(result).toEqual(expect.objectContaining({ id: '' }));
        });
    });

    describe('readSite', () => {
        it('should handle old format with hostname property', () => {
            // This test access private method using any type assertion
            const siteWithHostname = {
                hostname: 'example.com',
                id: 'site1',
                product: ProductJira,
            };

            const result = (siteManager as any).readSite(siteWithHostname);

            expect(result).toEqual(
                expect.objectContaining({
                    host: 'example.com',
                    id: 'site1',
                }),
            );
            expect(result.hostname).toBeUndefined();
        });
    });

    describe('resolvePrimarySite', () => {
        it('should set primarySite to undefined if no cloud sites exist', () => {
            const serverSite = createDetailedSiteInfo(ProductJira, 'server', 'user1', false);
            storedSites.set(`${ProductJira.key}Sites`, [serverSite]);

            siteManager_resolvePrimarySite();

            expect(siteManager.primarySite).toBeUndefined();
        });

        it('should set primarySite to the first cloud site sorted by name', () => {
            const cloudSiteA = createDetailedSiteInfo(ProductJira, 'cloudA', 'userA', true);
            cloudSiteA.name = 'Alpha';
            const cloudSiteB = createDetailedSiteInfo(ProductJira, 'cloudB', 'userB', true);
            cloudSiteB.name = 'Beta';
            storedSites.set(`${ProductJira.key}Sites`, [cloudSiteB, cloudSiteA]);

            siteManager_resolvePrimarySite();

            expect(siteManager.primarySite).toEqual(cloudSiteA);
        });

        it('should not change primarySite if already set to the first cloud site', () => {
            const cloudSiteA = createDetailedSiteInfo(ProductJira, 'cloudA', 'userA', true);
            cloudSiteA.name = 'Alpha';
            const cloudSiteB = createDetailedSiteInfo(ProductJira, 'cloudB', 'userB', true);
            cloudSiteB.name = 'Beta';
            storedSites.set(`${ProductJira.key}Sites`, [cloudSiteA, cloudSiteB]);

            siteManager_resolvePrimarySite();
            const firstPrimary = siteManager.primarySite;

            // Call again, should not change
            siteManager_resolvePrimarySite();
            expect(siteManager.primarySite).toBe(firstPrimary);
        });

        it('should update primarySite when cloud sites change', () => {
            const cloudSiteA = createDetailedSiteInfo(ProductJira, 'cloudA', 'userA', true);
            cloudSiteA.name = 'Alpha';
            storedSites.set(`${ProductJira.key}Sites`, [cloudSiteA]);

            siteManager_resolvePrimarySite();
            expect(siteManager.primarySite).toEqual(cloudSiteA);

            const cloudSiteB = createDetailedSiteInfo(ProductJira, 'cloudB', 'userB', true);
            cloudSiteB.name = 'Beta';
            storedSites.set(`${ProductJira.key}Sites`, [cloudSiteB]);

            siteManager_resolvePrimarySite();
            expect(siteManager.primarySite).toEqual(cloudSiteB);
        });
    });
});
