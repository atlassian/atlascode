import {
    AutocompleteSuggestion,
    FilterSearchResults,
    JQLAutocompleteData,
    JQLErrors,
} from '@atlassianlabs/jira-pi-common-models';
import { getProxyHostAndPort } from '@atlassianlabs/pi-client-common';
import axios from 'axios';
import { flatten } from 'flatten-anything';
import { merge } from 'merge-anything';
import { commands, ConfigurationTarget, env, Uri, window, workspace, WorkspaceEdit } from 'vscode';

import {
    AuthInfo,
    DetailedSiteInfo,
    emptyBasicAuthInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from '../../atlclients/authInfo';
import { configuration, JQLEntry } from '../../config/configuration';
import { Container } from '../../container';
import { getFeedbackUser } from '../../feedback/feedbackUser';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { FeedbackUser } from '../../lib/ipc/models/common';
import { ConfigTarget } from '../../lib/ipc/models/config';
import { FocusEventActions } from '../ExplorerFocusManager';
import { VSCConfigActionApi } from './vscConfigActionApi';

// Mock all external dependencies
jest.mock('@atlassianlabs/pi-client-common');
jest.mock('axios');
jest.mock('flatten-anything');
jest.mock('merge-anything');
jest.mock('vscode');
jest.mock('../../atlclients/authInfo');
jest.mock('../../config/configuration');
jest.mock('../../container');
jest.mock('../../feedback/feedbackUser');
jest.mock('../../lib/analyticsApi');
jest.mock('../../lib/cancellation');

describe('VSCConfigActionApi', () => {
    let vscConfigActionApi: VSCConfigActionApi;
    let mockAnalyticsApi: jest.Mocked<AnalyticsApi>;
    let mockCancelMan: jest.Mocked<CancellationManager>;
    let mockJiraClient: any;
    let mockLoginManager: any;
    let mockClientManager: any;
    let mockSiteManager: any;
    let mockCredentialManager: any;
    let mockExplorerFocusManager: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockAnalyticsApi = {
            fireFeatureChangeEvent: jest.fn(),
            fireCustomJQLCreatedEvent: jest.fn(),
        } as any;

        mockCancelMan = {
            set: jest.fn(),
        } as any;

        mockJiraClient = {
            getJQLAutocompleteData: jest.fn(),
            getFieldAutoCompleteSuggestions: jest.fn(),
            searchFilters: jest.fn(),
            validateJql: jest.fn(),
        };

        mockLoginManager = {
            userInitiatedServerLogin: jest.fn(),
            userInitiatedOAuthLogin: jest.fn(),
        };

        mockClientManager = {
            jiraClient: jest.fn().mockResolvedValue(mockJiraClient),
            removeClient: jest.fn(),
        };

        mockSiteManager = {
            getSitesAvailable: jest.fn(),
            removeSite: jest.fn(),
            getSiteForId: jest.fn(),
        };

        mockCredentialManager = {
            getAuthInfo: jest.fn(),
        };

        mockExplorerFocusManager = {
            fireEvent: jest.fn(),
        };

        // Mock Container
        (Container as any).loginManager = mockLoginManager;
        (Container as any).clientManager = mockClientManager;
        (Container as any).siteManager = mockSiteManager;
        (Container as any).credentialManager = mockCredentialManager;
        (Container as any).explorerFocusManager = mockExplorerFocusManager;
        (Container as any).configTarget = ConfigTarget.User;

        // Mock configuration
        (configuration as any).inspect = jest.fn();
        (configuration as any).get = jest.fn();
        (configuration as any).update = jest.fn();

        // Mock other dependencies
        (getFeedbackUser as jest.Mock).mockResolvedValue({ userId: 'test-user' });
        (getProxyHostAndPort as jest.Mock).mockReturnValue(['', '']);
        (flatten as jest.Mock).mockImplementation((obj) => obj);
        (merge as jest.Mock).mockImplementation((obj1, obj2) => ({ ...obj1, ...obj2 }));

        // Mock axios
        (axios.CancelToken as any).source = jest.fn().mockReturnValue({
            token: 'mock-token',
            cancel: jest.fn(),
        });

        // Mock vscode
        (env as any).remoteName = undefined;
        (commands as any).executeCommand = jest.fn();
        Object.defineProperty(workspace, 'workspaceFolders', {
            value: [{ uri: { fsPath: '/test/path' } }],
            writable: true,
            configurable: true,
        });
        Object.defineProperty(workspace, 'workspaceFile', {
            value: undefined,
            writable: true,
            configurable: true,
        });
        (workspace as any).applyEdit = jest.fn().mockResolvedValue(true);
        (workspace as any).openTextDocument = jest.fn().mockResolvedValue({});
        (window as any).showTextDocument = jest.fn();
        (Uri as any).file = jest.fn().mockReturnValue({ fsPath: '/test/path/.vscode/settings.json' });

        vscConfigActionApi = new VSCConfigActionApi(mockAnalyticsApi, mockCancelMan);
    });

    describe('constructor', () => {
        it('should initialize with analytics api and cancellation manager', () => {
            expect(vscConfigActionApi).toBeInstanceOf(VSCConfigActionApi);
            expect(vscConfigActionApi['_analyticsApi']).toBe(mockAnalyticsApi);
            expect(vscConfigActionApi['_cancelMan']).toBe(mockCancelMan);
        });
    });

    describe('authenticateServer', () => {
        it('should call userInitiatedServerLogin', async () => {
            const site = { id: 'test-site', host: 'test.com', product: ProductJira } as unknown as SiteInfo;
            const authInfo = { username: 'test-user', user: 'test-user', state: 'valid' } as unknown as AuthInfo;

            await vscConfigActionApi.authenticateServer(site, authInfo);

            expect(mockLoginManager.userInitiatedServerLogin).toHaveBeenCalledWith(site, authInfo);
        });
    });

    describe('authenticateCloud', () => {
        it('should call userInitiatedOAuthLogin', async () => {
            const site = { id: 'test-site', host: 'test.com', product: ProductJira } as unknown as SiteInfo;
            const callback = 'test-callback';

            await vscConfigActionApi.authenticateCloud(site, callback);

            expect(mockLoginManager.userInitiatedOAuthLogin).toHaveBeenCalledWith(site, callback);
        });
    });

    describe('clearAuth', () => {
        it('should remove client and site', async () => {
            const site: DetailedSiteInfo = { id: 'test-site' } as DetailedSiteInfo;

            await vscConfigActionApi.clearAuth(site);

            expect(mockClientManager.removeClient).toHaveBeenCalledWith(site);
            expect(mockSiteManager.removeSite).toHaveBeenCalledWith(site);
        });
    });

    describe('fetchJqlOptions', () => {
        it('should fetch JQL autocomplete data', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const mockData = {
                visibleFieldNames: [],
                visibleFunctionNames: [],
                jqlReservedWords: [],
            } as unknown as JQLAutocompleteData;

            mockJiraClient.getJQLAutocompleteData.mockResolvedValue(mockData);

            const result = await vscConfigActionApi.fetchJqlOptions(site);

            expect(mockClientManager.jiraClient).toHaveBeenCalledWith(site);
            expect(mockJiraClient.getJQLAutocompleteData).toHaveBeenCalled();
            expect(result).toBe(mockData);
        });
    });

    describe('fetchJqlSuggestions', () => {
        it('should fetch JQL suggestions without abort key', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const fieldName = 'assignee';
            const userInput = 'test';
            const mockSuggestions = [{ value: 'test-user' }] as unknown as AutocompleteSuggestion[];

            mockJiraClient.getFieldAutoCompleteSuggestions.mockResolvedValue(mockSuggestions);

            const result = await vscConfigActionApi.fetchJqlSuggestions(site, fieldName, userInput);

            expect(mockJiraClient.getFieldAutoCompleteSuggestions).toHaveBeenCalledWith(
                fieldName,
                userInput,
                undefined,
                undefined,
            );
            expect(result).toBe(mockSuggestions);
        });

        it('should fetch JQL suggestions with abort key', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const fieldName = 'assignee';
            const userInput = 'test';
            const predicateName = 'in';
            const abortKey = 'test-abort';
            const mockSuggestions = [{ value: 'test-user' }] as unknown as AutocompleteSuggestion[];

            mockJiraClient.getFieldAutoCompleteSuggestions.mockResolvedValue(mockSuggestions);

            const result = await vscConfigActionApi.fetchJqlSuggestions(
                site,
                fieldName,
                userInput,
                predicateName,
                abortKey,
            );

            expect(mockCancelMan.set).toHaveBeenCalledWith(abortKey, expect.any(Object));
            expect(mockJiraClient.getFieldAutoCompleteSuggestions).toHaveBeenCalledWith(
                fieldName,
                userInput,
                predicateName,
                'mock-token',
            );
            expect(result).toBe(mockSuggestions);
        });
    });

    describe('fetchFilterSearchResults', () => {
        it('should fetch filter search results without abort key', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const query = 'test filter';
            const mockResults = {
                values: [],
                maxResults: 10,
                offset: 0,
                total: 0,
                isLast: true,
                filters: [],
            } as unknown as FilterSearchResults;

            mockJiraClient.searchFilters.mockResolvedValue(mockResults);

            const result = await vscConfigActionApi.fetchFilterSearchResults(site, query);

            expect(mockJiraClient.searchFilters).toHaveBeenCalledWith(query, undefined, undefined, undefined);
            expect(result).toBe(mockResults);
        });

        it('should fetch filter search results with all parameters', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const query = 'test filter';
            const maxResults = 10;
            const startAt = 0;
            const abortKey = 'test-abort';
            const mockResults = {
                values: [],
                maxResults: 10,
                offset: 0,
                total: 0,
                isLast: true,
                filters: [],
            } as unknown as FilterSearchResults;

            mockJiraClient.searchFilters.mockResolvedValue(mockResults);

            const result = await vscConfigActionApi.fetchFilterSearchResults(
                site,
                query,
                maxResults,
                startAt,
                abortKey,
            );

            expect(mockCancelMan.set).toHaveBeenCalledWith(abortKey, expect.any(Object));
            expect(mockJiraClient.searchFilters).toHaveBeenCalledWith(query, maxResults, startAt, 'mock-token');
            expect(result).toBe(mockResults);
        });
    });

    describe('validateJql', () => {
        it('should validate JQL without abort key', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const jql = 'assignee = currentUser()';
            const mockErrors = { errors: [] } as unknown as JQLErrors;

            mockJiraClient.validateJql.mockResolvedValue(mockErrors);

            const result = await vscConfigActionApi.validateJql(site, jql);

            expect(mockJiraClient.validateJql).toHaveBeenCalledWith(jql, undefined);
            expect(result).toBe(mockErrors);
        });

        it('should validate JQL with abort key', async () => {
            const site = { id: 'test-site' } as unknown as DetailedSiteInfo;
            const jql = 'assignee = currentUser()';
            const abortKey = 'test-abort';
            const mockErrors = { errors: [] } as unknown as JQLErrors;

            mockJiraClient.validateJql.mockResolvedValue(mockErrors);

            const result = await vscConfigActionApi.validateJql(site, jql, abortKey);

            expect(mockCancelMan.set).toHaveBeenCalledWith(abortKey, expect.any(Object));
            expect(mockJiraClient.validateJql).toHaveBeenCalledWith(jql, 'mock-token');
            expect(result).toBe(mockErrors);
        });
    });

    describe('getSitesAvailable', () => {
        it('should return available sites for both products', () => {
            const mockJiraSites = [{ id: 'jira-site' }] as unknown as DetailedSiteInfo[];
            const mockBitbucketSites = [{ id: 'bb-site' }] as unknown as DetailedSiteInfo[];

            mockSiteManager.getSitesAvailable
                .mockReturnValueOnce(mockJiraSites)
                .mockReturnValueOnce(mockBitbucketSites);

            const [jiraSites, bitbucketSites] = vscConfigActionApi.getSitesAvailable();

            expect(mockSiteManager.getSitesAvailable).toHaveBeenNthCalledWith(1, ProductJira);
            expect(mockSiteManager.getSitesAvailable).toHaveBeenNthCalledWith(2, ProductBitbucket);
            expect(jiraSites).toBe(mockJiraSites);
            expect(bitbucketSites).toBe(mockBitbucketSites);
        });
    });

    describe('getSitesWithAuth', () => {
        it('should return sites with auth info', async () => {
            const mockJiraSites = [{ id: 'jira-site', isCloud: true }] as unknown as DetailedSiteInfo[];
            const mockBitbucketSites = [{ id: 'bb-site', isCloud: false }] as unknown as DetailedSiteInfo[];
            const mockAuthInfo = { username: 'test' } as unknown as AuthInfo;

            mockSiteManager.getSitesAvailable
                .mockReturnValueOnce(mockJiraSites)
                .mockReturnValueOnce(mockBitbucketSites);

            mockCredentialManager.getAuthInfo.mockResolvedValueOnce(mockAuthInfo).mockResolvedValueOnce(null);

            const [jiraSites, bitbucketSites] = await vscConfigActionApi.getSitesWithAuth();

            expect(jiraSites).toHaveLength(1);
            expect(jiraSites[0].site).toBe(mockJiraSites[0]);
            expect(jiraSites[0].auth).toBe(mockAuthInfo);

            expect(bitbucketSites).toHaveLength(1);
            expect(bitbucketSites[0].site).toBe(mockBitbucketSites[0]);
            expect(bitbucketSites[0].auth).toBe(emptyBasicAuthInfo);
        });
    });

    describe('getFeedbackUser', () => {
        it('should return feedback user', async () => {
            const mockUser = {
                userId: 'test-user',
                userName: 'Test User',
                emailAddress: 'test@example.com',
            } as unknown as FeedbackUser;
            (getFeedbackUser as jest.Mock).mockResolvedValue(mockUser);

            const result = await vscConfigActionApi.getFeedbackUser();

            expect(getFeedbackUser).toHaveBeenCalled();
            expect(result).toBe(mockUser);
        });
    });

    describe('getIsRemote', () => {
        it('should return false when not remote', () => {
            (env as any).remoteName = undefined;

            const result = vscConfigActionApi.getIsRemote();

            expect(result).toBe(false);
        });

        it('should return true when remote', () => {
            Object.defineProperty(env, 'remoteName', {
                value: 'ssh-remote',
                writable: true,
                configurable: true,
            });

            const result = vscConfigActionApi.getIsRemote();

            expect(result).toBe(true);
        });
    });

    describe('getConfigTarget', () => {
        it('should return current config target', () => {
            const result = vscConfigActionApi.getConfigTarget();

            expect(result).toBe(ConfigTarget.User);
        });
    });

    describe('setConfigTarget', () => {
        it('should set config target', () => {
            vscConfigActionApi.setConfigTarget(ConfigTarget.Workspace);

            expect(Container.configTarget).toBe(ConfigTarget.Workspace);
        });
    });

    describe('shouldShowTunnelOption', () => {
        it('should return false when no proxy host', () => {
            (getProxyHostAndPort as jest.Mock).mockReturnValue(['', '']);

            const result = vscConfigActionApi.shouldShowTunnelOption();

            expect(result).toBe(false);
        });

        it('should return true when proxy host is configured', () => {
            (getProxyHostAndPort as jest.Mock).mockReturnValue(['proxy.example.com', '8080']);

            const result = vscConfigActionApi.shouldShowTunnelOption();

            expect(result).toBe(true);
        });
    });

    describe('flattenedConfigForTarget', () => {
        beforeEach(() => {
            (configuration.inspect as jest.Mock).mockReturnValue({
                defaultValue: { default: 'value' },
                globalValue: { global: 'value' },
                workspaceValue: { workspace: 'value' },
                workspaceFolderValue: { workspaceFolder: 'value' },
            });
        });

        it('should return flattened config for workspace target', () => {
            const result = vscConfigActionApi.flattenedConfigForTarget(ConfigTarget.Workspace);

            expect(merge).toHaveBeenCalledWith({ default: 'value' }, { workspace: 'value' });
            expect(result).toEqual({ default: 'value', workspace: 'value' });
        });

        it('should return flattened config for workspace folder target', () => {
            const result = vscConfigActionApi.flattenedConfigForTarget(ConfigTarget.WorkspaceFolder);

            expect(merge).toHaveBeenCalledWith({ default: 'value' }, { workspaceFolder: 'value' });
            expect(result).toEqual({ default: 'value', workspaceFolder: 'value' });
        });

        it('should return flattened config for user target', () => {
            const result = vscConfigActionApi.flattenedConfigForTarget(ConfigTarget.User);

            expect(merge).toHaveBeenCalledWith({ default: 'value' }, { global: 'value' });
            expect(result).toEqual({ default: 'value', global: 'value' });
        });

        it('should return default config when no target value exists', () => {
            (configuration.inspect as jest.Mock).mockReturnValue({
                defaultValue: { default: 'value' },
                globalValue: null,
                workspaceValue: null,
                workspaceFolderValue: null,
            });

            const result = vscConfigActionApi.flattenedConfigForTarget(ConfigTarget.User);

            expect(result).toEqual({ default: 'value' });
        });
    });

    describe('updateSettings', () => {
        it('should update settings for user target', async () => {
            const changes = { 'test.setting': true };

            await vscConfigActionApi.updateSettings(ConfigTarget.User, changes);

            expect(configuration.update).toHaveBeenCalledWith('test.setting', true, ConfigurationTarget.Global);
            expect(mockAnalyticsApi.fireFeatureChangeEvent).toHaveBeenCalledWith('test.setting', true);
        });

        it('should update settings for workspace target', async () => {
            const changes = { 'test.setting': 'value' };

            await vscConfigActionApi.updateSettings(ConfigTarget.Workspace, changes);

            expect(configuration.update).toHaveBeenCalledWith('test.setting', 'value', ConfigurationTarget.Workspace);
            expect(mockAnalyticsApi.fireFeatureChangeEvent).not.toHaveBeenCalled();
        });

        it('should update JQL settings and fire analytics event', async () => {
            const newJql = {
                id: 'new-jql',
                siteId: 'test-site',
                name: 'Test JQL',
                query: 'test',
                enabled: true,
                monitor: false,
            } as unknown as JQLEntry;
            const changes = { 'jira.jqlList': [newJql] };
            const mockSite = { id: 'test-site' } as unknown as DetailedSiteInfo;

            (configuration.get as jest.Mock).mockReturnValue([]);
            mockSiteManager.getSiteForId.mockReturnValue(mockSite);

            await vscConfigActionApi.updateSettings(ConfigTarget.User, changes);

            expect(configuration.update).toHaveBeenCalledWith('jira.jqlList', [newJql], ConfigurationTarget.Global);
            expect(mockSiteManager.getSiteForId).toHaveBeenCalledWith(ProductJira, 'test-site');
            expect(mockAnalyticsApi.fireCustomJQLCreatedEvent).toHaveBeenCalledWith(mockSite);
        });

        it('should remove settings when removes array is provided', async () => {
            const changes = { 'test.setting': 'value' };
            const removes = ['test.remove'];

            await vscConfigActionApi.updateSettings(ConfigTarget.User, changes, removes);

            expect(configuration.update).toHaveBeenCalledWith('test.setting', 'value', ConfigurationTarget.Global);
            expect(configuration.update).toHaveBeenCalledWith('test.remove', undefined, ConfigurationTarget.Global);
        });
    });

    describe('openJsonSettingsFile', () => {
        it('should open user settings file', async () => {
            await vscConfigActionApi.openJsonSettingsFile(ConfigTarget.User);

            expect(commands.executeCommand).toHaveBeenCalledWith('workbench.action.openSettingsJson');
        });

        it('should open workspace config file when workspace file exists', async () => {
            Object.defineProperty(workspace, 'workspaceFile', {
                value: Uri.file('/test/workspace.code-workspace'),
                writable: true,
                configurable: true,
            });

            await vscConfigActionApi.openJsonSettingsFile(ConfigTarget.Workspace);

            expect(commands.executeCommand).toHaveBeenCalledWith('workbench.action.openWorkspaceConfigFile');
        });

        it('should create workspace settings.json when no workspace file exists', async () => {
            Object.defineProperty(workspace, 'workspaceFile', {
                value: undefined,
                writable: true,
                configurable: true,
            });

            // Mock WorkspaceEdit constructor
            const mockCreateFile = jest.fn();
            (WorkspaceEdit as any) = jest.fn().mockImplementation(() => ({
                createFile: mockCreateFile,
            }));

            // this to suppress the lint error for no-unused-vars
            if (!WorkspaceEdit) {
                throw new Error('Error mocking WorkspaceEdit');
            }

            await vscConfigActionApi.openJsonSettingsFile(ConfigTarget.Workspace);

            expect(mockCreateFile).toHaveBeenCalledWith(expect.any(Object), { ignoreIfExists: true });
            expect(workspace.applyEdit).toHaveBeenCalledWith(expect.any(Object));
        });
    });

    describe('explorer focus manager methods', () => {
        it('should fire create issue event', () => {
            vscConfigActionApi.createJiraIssue();

            expect(mockExplorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.CREATEISSUE, true);
        });

        it('should fire view issue event', () => {
            vscConfigActionApi.viewJiraIssue();

            expect(mockExplorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.VIEWISSUE, true);
        });

        it('should fire create pull request event', () => {
            vscConfigActionApi.createPullRequest();

            expect(mockExplorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.CREATEPULLREQUEST, true);
        });

        it('should fire view pull request event', () => {
            vscConfigActionApi.viewPullRequest();

            expect(mockExplorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.VIEWPULLREQUEST, true);
        });
    });
});
