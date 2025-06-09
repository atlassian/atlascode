import { it } from '@jest/globals';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { JQLEntry } from '../config/model';
import { Container } from '../container';
import { JQLManager } from './jqlManager';

const mockedSites = [
    expansionCastTo<DetailedSiteInfo>({
        id: 'siteDetailsId1',
        name: 'MockedSite1',
    }),
    expansionCastTo<DetailedSiteInfo>({
        id: 'siteDetailsId2',
        name: 'MockedSite2',
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
            expect(entry.name).toEqual(expect.any(String));
            expect(entry.query).toEqual('assignee = currentUser() AND StatusCategory != Done ORDER BY updated DESC');
            expect(entry.enabled).toBeTruthy();
            expect(entry.monitor).toBeTruthy();
        });

        expect(entries[0].id).toEqual('siteDetailsId1');
        expect(entries[1].id).toEqual('siteDetailsId2');
    });
});
