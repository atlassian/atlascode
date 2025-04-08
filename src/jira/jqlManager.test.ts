import { JiraClient } from '@atlassianlabs/jira-pi-client';
import { it } from '@jest/globals';

import { expansionCastTo } from '../../testsutil';
import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { configuration } from '../config/configuration';
import { JQLEntry } from '../config/model';
import { Container } from '../container';
import { JQLManager } from './jqlManager';
//import { EventEmitter } from 'vscode';

const mockedSites = [
    expansionCastTo<DetailedSiteInfo>({
        id: 'siteDetailsId1',
        name: 'MockedSite1',
        hasResolutionField: true,
    }),
    expansionCastTo<DetailedSiteInfo>({
        id: 'siteDetailsId2',
        name: 'MockedSite2',
        hasResolutionField: false,
    }),
];

const mockedJqlEntries = [
    expansionCastTo<JQLEntry>({
        id: 'jqlId1',
        siteId: 'siteDetailsId1',
        query: 'assignee = currentUser() AND resolution = Unresolved ORDER BY lastViewed DESC',
        enabled: true,
        monitor: true,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId2',
        siteId: 'siteDetailsId2',
        query: 'assignee = currentUser() ORDER BY lastViewed DESC',
        enabled: true,
        monitor: true,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId3',
        siteId: 'siteDetailsId1',
        query: 'assignee = currentUser() AND isCustomQuery = true ORDER BY lastViewed DESC',
        enabled: true,
        monitor: true,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId3',
        siteId: 'siteDetailsId2',
        query: 'assignee = currentUser() AND isCustomQuery = true ORDER BY lastViewed DESC',
        enabled: true,
        monitor: true,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId4',
        siteId: 'siteDetailsId1',
        query: 'assignee = currentUser() AND isCustomQuery = true ORDER BY lastViewed DESC',
        enabled: true,
        monitor: false,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId5',
        siteId: 'siteDetailsId2',
        query: 'assignee = currentUser() AND isCustomQuery = true ORDER BY lastViewed DESC',
        enabled: false,
        monitor: true,
    }),
    expansionCastTo<JQLEntry>({
        id: 'jqlId6',
        siteId: 'siteDetailsId1',
        query: 'assignee = currentUser() AND isCustomQuery = true ORDER BY lastViewed DESC',
        enabled: false,
        monitor: false,
    }),
];

jest.mock('../logger');
jest.mock('../config/configuration', () => ({
    configuration: {
        onDidChange: () => {},
        update: () => {},
    },
}));
jest.mock('../container', () => ({
    Container: {
        config: {
            jira: {
                jqlList: [],
            },
        },
        siteManager: {
            getSitesAvailable: () => [],
            getSiteForId: (product: any, id: string) => {
                throw new Error(`${id} not found`);
            },
            addOrUpdateSite: () => {},
        },
        clientManager: {
            jiraClient: () => Promise.reject("Shouldn't have been called"),
        },
    },
}));

describe('JQLManager', () => {
    let jqlManager: JQLManager;

    beforeEach(() => {
        Container.config.jira.jqlList = mockedJqlEntries;

        jest.spyOn(Container.siteManager, 'getSitesAvailable').mockImplementation((product) => {
            if (product.key === ProductJira.key) {
                return mockedSites;
            } else {
                throw new Error("JQLManager is not supposed to call 'getSitesAvailable' for BitBucket.");
            }
        });

        jest.spyOn(Container.siteManager, 'getSiteForId').mockImplementation((product, id) => {
            if (product.key === ProductJira.key) {
                const site = mockedSites.find((x) => x.id === id);
                if (!site) {
                    throw new Error(`${id} not found`);
                }
                return site;
            } else {
                throw new Error("JQLManager is not supposed to call 'getSitesAvailable' for BitBucket.");
            }
        });

        jqlManager = new JQLManager();
    });

    afterEach(() => {
        jqlManager.dispose();
        jest.restoreAllMocks();
    });

    it('notifiableJQLEntries retrieves all the enabled and monitored entries', () => {
        const entries = jqlManager.notifiableJQLEntries();
        expect(entries).toHaveLength(4);
        expect(entries).toEqual([mockedJqlEntries[0], mockedJqlEntries[1], mockedJqlEntries[2], mockedJqlEntries[3]]);
    });

    it('enabledJQLEntries retrieves all the enabled entries', () => {
        const entries = jqlManager.enabledJQLEntries();
        expect(entries).toHaveLength(5);
        expect(entries).toEqual([
            mockedJqlEntries[0],
            mockedJqlEntries[1],
            mockedJqlEntries[2],
            mockedJqlEntries[3],
            mockedJqlEntries[4],
        ]);
    });

    it('getAllDefaultJQLEntries returns a list of default JQL entries for every site', () => {
        const entries = jqlManager.getAllDefaultJQLEntries();

        expect(entries).toHaveLength(2);

        entries.forEach((entry) => {
            expect(entry.query).toEqual('assignee = currentUser() AND StatusCategory != Done ORDER BY updated DESC');
            expect(entry.enabled).toBeTruthy();
            expect(entry.monitor).toBeTruthy();
        });

        expect(entries[0].id).toEqual('siteDetailsId1');
        expect(entries[1].id).toEqual('siteDetailsId2');
    });

    it('getCustomJQLEntries retrieves the list of customized and enabled JQL entries', () => {
        const entries = jqlManager.getCustomJQLEntries();

        expect(entries).toHaveLength(3);
        expect(entries).toEqual([mockedJqlEntries[2], mockedJqlEntries[3], mockedJqlEntries[4]]);
    });

    it.each([
        ['resolution', true],
        ['anotherField', false],
    ])(
        'backFillOldDetailedSiteInfos should backfill old site info with resolution field',
        async (fieldId, expectedHasResolutionField) => {
            const mockSite = expansionCastTo<DetailedSiteInfo>({
                id: 'site1',
                name: 'Site 1',
                hasResolutionField: undefined,
            });

            (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([mockSite]);
            jest.spyOn(Container.clientManager, 'jiraClient').mockResolvedValue(
                expansionCastTo<JiraClient<DetailedSiteInfo>>({
                    getFields: jest.fn().mockResolvedValue([{ id: fieldId }]),
                }),
            );

            jest.spyOn(Container.siteManager, 'addOrUpdateSite');

            await JQLManager.backFillOldDetailedSiteInfos();

            expect(Container.siteManager.addOrUpdateSite).toHaveBeenCalledWith(mockSite);
            expect(mockSite.hasResolutionField).toBe(expectedHasResolutionField);
        },
    );

    it('initializeJQL should initialize JQL entries for new sites', async () => {
        const mockSite = expansionCastTo<DetailedSiteInfo>({
            id: 'site1',
            name: 'Site 1',
            hasResolutionField: undefined,
        });

        let actualValue: JQLEntry[] = [];

        jest.spyOn(configuration, 'update').mockImplementation((section, value, target) => {
            actualValue = value;
            return Promise.resolve();
        });

        Container.config.jira.jqlList = [];
        await jqlManager.initializeJQL([mockSite]);

        expect(configuration.update).toHaveBeenCalledWith(
            'jira.jqlList',
            expect.anything(),
            1 /*vscode.ConfigurationTarget.Global*/,
        );
        expect(actualValue).toHaveLength(1);

        expect(actualValue[0].siteId).toBe('site1');
        expect(actualValue[0].id).toBeDefined();
        expect(actualValue[0].id).not.toEqual(actualValue[0].siteId);
    });
});
