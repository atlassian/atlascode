const mockJqlEntries = [
    {
        id: '1',
        name: 'Test JQL Entry',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
    {
        id: '2',
        name: 'Test JQL Entry 2',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
];

const mockEnabledJqlEntries = jest.fn().mockReturnValue(mockJqlEntries);
jest.mock('../../../container', () => ({
    Container: {
        jqlManager: {
            enabledJQLEntries: mockEnabledJqlEntries,
            onDidJQLChange: jest.fn(),
            updateFilters: jest.fn(),
        },
        siteManager: {
            onDidSitesAvailableChange: jest.fn(),
        },
    },
}));

const mockExecuteQuery = jest.fn().mockReturnValue(Promise.resolve([]));
jest.mock('../customJqlTree', () => {
    return {
        CustomJQLTree: jest.fn().mockImplementation(() => ({
            dispose: jest.fn(),
            executeQuery: mockExecuteQuery,
            setNumIssues: jest.fn(),
        })),
    };
});

jest.mock('../searchJiraHelper', () => ({
    SearchJiraHelper: {
        clearIssues: jest.fn(),
        setIssues: jest.fn(),
    },
}));

const mockCheckForNewIssues = jest.fn();
jest.mock('../../../jira/newIssueMonitor', () => {
    return {
        NewIssueMonitor: jest.fn().mockImplementation(() => ({
            checkForNewIssues: mockCheckForNewIssues,
        })),
    };
});

import { Container } from '../../../container';
import { ConfigureJQLNode } from '../configureJQLNode';
import { CustomJQLTree } from '../customJqlTree';
import { SearchJiraHelper } from '../searchJiraHelper';
import { CustomJQLViewProvider } from './customJqlViewProvider';

describe('CustomJqlViewProvider', () => {
    it('should grab JQL entries', () => {
        new CustomJQLViewProvider();
        expect(Container.jqlManager.enabledJQLEntries).toHaveBeenCalled();
    });

    describe('getChildren', () => {
        it('should execute each jql and return 2 custom jql trees', async () => {
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();
            mockJqlEntries.forEach((jql) => {
                expect(CustomJQLTree).toHaveBeenCalledWith(jql);
            });
            expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
            expect(SearchJiraHelper.setIssues).toHaveBeenCalled();
            expect(children).toHaveLength(2);
        });

        it('should return a ConfigureJQLNode if no jql entries are enabled', async () => {
            mockEnabledJqlEntries.mockReturnValue([]);
            const provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();
            expect(children).toHaveLength(1);
            expect(children[0]).toBeInstanceOf(ConfigureJQLNode);
        });
    });

    describe('refresh', () => {
        it('should update the jql entries and refresh the tree', async () => {
            const provider = new CustomJQLViewProvider();
            await provider.refresh();
            expect(Container.jqlManager.updateFilters).toHaveBeenCalled();
            expect(SearchJiraHelper.clearIssues).toHaveBeenCalled();
            expect(provider['_children']).toEqual([]);
            expect(Container.jqlManager.enabledJQLEntries).toHaveBeenCalled();
            expect(mockCheckForNewIssues).toHaveBeenCalled();
        });
    });
});
