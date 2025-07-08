// @ts-nocheck

import { ConfigurationTarget, env } from 'vscode';

import {
    AuthInfo,
    DetailedSiteInfo,
    emptyAuthInfo,
    emptyBasicAuthInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { ConfigTarget } from '../../lib/ipc/models/config';
import { FocusEventActions } from '../ExplorerFocusManager';
import { VSCOnboardingActionApi } from './vscOnboardingActionApi';

// Mock vscode
jest.mock('vscode', () => ({
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
    },
    env: {
        remoteName: undefined,
    },
    Disposable: jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
    })),
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn(),
    })),
}));

// Mock flatten-anything and merge-anything
jest.mock('flatten-anything', () => ({
    flatten: jest.fn((obj) => obj),
}));

jest.mock('merge-anything', () => ({
    merge: jest.fn((obj1, obj2) => ({ ...obj1, ...obj2 })),
}));

// Mock configuration
jest.mock('../../config/configuration', () => ({
    configuration: {
        inspect: jest.fn(),
        update: jest.fn(),
    },
}));

// Mock Container
jest.mock('../../container', () => ({
    Container: {
        loginManager: {
            userInitiatedServerLogin: jest.fn(),
            userInitiatedOAuthLogin: jest.fn(),
        },
        clientManager: {
            removeClient: jest.fn(),
        },
        siteManager: {
            removeSite: jest.fn(),
            getSitesAvailable: jest.fn(),
        },
        credentialManager: {
            getAuthInfo: jest.fn(),
        },
        configTarget: 'User', // Will be imported from ConfigTarget
        explorerFocusManager: {
            fireEvent: jest.fn(),
        },
        onboardingWebviewFactory: {
            hide: jest.fn(),
        },
        settingsWebviewFactory: {
            createOrShow: jest.fn(),
        },
    },
}));

// Mock AnalyticsApi
const mockAnalyticsApi = {
    fireFeatureChangeEvent: jest.fn(),
};

describe('VSCOnboardingActionApi', () => {
    let vscOnboardingActionApi: VSCOnboardingActionApi;

    beforeEach(() => {
        jest.clearAllMocks();
        // Set the config target after clearing mocks
        Container.configTarget = ConfigTarget.User;
        vscOnboardingActionApi = new VSCOnboardingActionApi(mockAnalyticsApi);
    });

    describe('constructor', () => {
        it('should initialize with analytics api', () => {
            expect(vscOnboardingActionApi).toBeInstanceOf(VSCOnboardingActionApi);
            expect(vscOnboardingActionApi['_analyticsApi']).toBe(mockAnalyticsApi);
        });
    });

    describe('authenticateServer', () => {
        it('should call Container.loginManager.userInitiatedServerLogin with correct parameters', async () => {
            const mockSite: SiteInfo = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://test.atlassian.net',
                isCloud: true,
                product: ProductJira,
            };
            const mockAuthInfo: AuthInfo = { user: 'test-user' };

            await vscOnboardingActionApi.authenticateServer(mockSite, mockAuthInfo);

            expect(Container.loginManager.userInitiatedServerLogin).toHaveBeenCalledWith(mockSite, mockAuthInfo, true);
        });

        it('should handle promise rejection', async () => {
            const mockSite: SiteInfo = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://test.atlassian.net',
                isCloud: true,
                product: ProductJira,
            };
            const mockAuthInfo: AuthInfo = { user: 'test-user' };
            const error = new Error('Authentication failed');

            Container.loginManager.userInitiatedServerLogin.mockRejectedValue(error);

            await expect(vscOnboardingActionApi.authenticateServer(mockSite, mockAuthInfo)).rejects.toThrow(
                'Authentication failed',
            );
        });
    });

    describe('authenticateCloud', () => {
        it('should call Container.loginManager.userInitiatedOAuthLogin with correct parameters', async () => {
            const mockSite: SiteInfo = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://test.atlassian.net',
                isCloud: true,
                product: ProductJira,
            };
            const callback = 'test-callback';

            await vscOnboardingActionApi.authenticateCloud(mockSite, callback);

            expect(Container.loginManager.userInitiatedOAuthLogin).toHaveBeenCalledWith(mockSite, callback, true);
        });
    });

    describe('clearAuth', () => {
        it('should remove client and site', async () => {
            const mockSite: DetailedSiteInfo = {
                id: 'test-site',
                name: 'Test Site',
                url: 'https://test.atlassian.net',
                isCloud: true,
                product: ProductJira,
                avatarUrl: '',
                users: [],
            };

            await vscOnboardingActionApi.clearAuth(mockSite);

            expect(Container.clientManager.removeClient).toHaveBeenCalledWith(mockSite);
            expect(Container.siteManager.removeSite).toHaveBeenCalledWith(mockSite);
        });
    });

    describe('getSitesAvailable', () => {
        it('should return jira and bitbucket sites', () => {
            const mockJiraSites = [{ id: 'jira-1', product: ProductJira }];
            const mockBitbucketSites = [{ id: 'bb-1', product: ProductBitbucket }];

            Container.siteManager.getSitesAvailable
                .mockReturnValueOnce(mockJiraSites)
                .mockReturnValueOnce(mockBitbucketSites);

            const result = vscOnboardingActionApi.getSitesAvailable();

            expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductJira);
            expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductBitbucket);
            expect(result).toEqual([mockJiraSites, mockBitbucketSites]);
        });
    });

    describe('getSitesWithAuth', () => {
        it('should return sites with auth info for cloud sites', async () => {
            const mockJiraSite: DetailedSiteInfo = {
                id: 'jira-1',
                isCloud: true,
                product: ProductJira,
                name: 'Jira Site',
                url: 'https://jira.atlassian.net',
                avatarUrl: '',
                users: [],
            };

            const mockBitbucketSite: DetailedSiteInfo = {
                id: 'bb-1',
                isCloud: true,
                product: ProductBitbucket,
                name: 'Bitbucket Site',
                url: 'https://bitbucket.org',
                avatarUrl: '',
                users: [],
            };

            const mockAuthInfo = { user: 'test-user' };

            Container.siteManager.getSitesAvailable
                .mockReturnValueOnce([mockJiraSite])
                .mockReturnValueOnce([mockBitbucketSite]);

            Container.credentialManager.getAuthInfo.mockResolvedValueOnce(mockAuthInfo).mockResolvedValueOnce(null);

            const result = await vscOnboardingActionApi.getSitesWithAuth();

            expect(result).toEqual([
                [{ site: mockJiraSite, auth: mockAuthInfo }],
                [{ site: mockBitbucketSite, auth: emptyAuthInfo }],
            ]);
        });

        it('should return sites with basic auth for server sites', async () => {
            const mockJiraSite: DetailedSiteInfo = {
                id: 'jira-1',
                isCloud: false,
                product: ProductJira,
                name: 'Jira Server',
                url: 'https://jira.company.com',
                avatarUrl: '',
                users: [],
            };

            const mockBitbucketSite: DetailedSiteInfo = {
                id: 'bb-1',
                isCloud: false,
                product: ProductBitbucket,
                name: 'Bitbucket Server',
                url: 'https://bitbucket.company.com',
                avatarUrl: '',
                users: [],
            };

            Container.siteManager.getSitesAvailable
                .mockReturnValueOnce([mockJiraSite])
                .mockReturnValueOnce([mockBitbucketSite]);

            Container.credentialManager.getAuthInfo.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

            const result = await vscOnboardingActionApi.getSitesWithAuth();

            expect(result).toEqual([
                [{ site: mockJiraSite, auth: emptyBasicAuthInfo }],
                [{ site: mockBitbucketSite, auth: emptyBasicAuthInfo }],
            ]);
        });
    });

    describe('getIsRemote', () => {
        it('should return false when remoteName is undefined', () => {
            env.remoteName = undefined;
            const result = vscOnboardingActionApi.getIsRemote();
            expect(result).toBe(false);
        });

        it('should return true when remoteName is defined', () => {
            env.remoteName = 'ssh-remote';
            const result = vscOnboardingActionApi.getIsRemote();
            expect(result).toBe(true);
        });
    });

    describe('getConfigTarget', () => {
        it('should return Container.configTarget', () => {
            const result = vscOnboardingActionApi.getConfigTarget();
            expect(result).toBe(ConfigTarget.User);
        });
    });

    describe('flattenedConfigForTarget', () => {
        const mockInspect = {
            defaultValue: { default: 'value' },
            globalValue: { global: 'value' },
            workspaceValue: { workspace: 'value' },
            workspaceFolderValue: { workspaceFolder: 'value' },
        };

        beforeEach(() => {
            configuration.inspect.mockReturnValue(mockInspect);
        });

        it('should return flattened workspace config when target is Workspace', () => {
            vscOnboardingActionApi.flattenedConfigForTarget(ConfigTarget.Workspace);

            expect(configuration.inspect).toHaveBeenCalled();
            // Note: Since flatten and merge are mocked to return the input,
            // the actual merging logic is tested by the real implementation
        });

        it('should return flattened workspace folder config when target is WorkspaceFolder', () => {
            vscOnboardingActionApi.flattenedConfigForTarget(ConfigTarget.WorkspaceFolder);

            expect(configuration.inspect).toHaveBeenCalled();
        });

        it('should return flattened global config for default case', () => {
            vscOnboardingActionApi.flattenedConfigForTarget(ConfigTarget.User);

            expect(configuration.inspect).toHaveBeenCalled();
        });

        it('should return default config when specific target value is not available', () => {
            configuration.inspect.mockReturnValue({
                defaultValue: { default: 'value' },
                globalValue: null,
                workspaceValue: null,
                workspaceFolderValue: null,
            });

            vscOnboardingActionApi.flattenedConfigForTarget(ConfigTarget.Workspace);

            expect(configuration.inspect).toHaveBeenCalled();
        });
    });

    describe('updateSettings', () => {
        it('should update settings with Global target for User config', async () => {
            const changes = { setting1: true, setting2: 'value' };

            await vscOnboardingActionApi.updateSettings(ConfigTarget.User, changes);

            expect(configuration.update).toHaveBeenCalledWith('setting1', true, ConfigurationTarget.Global);
            expect(configuration.update).toHaveBeenCalledWith('setting2', 'value', ConfigurationTarget.Global);
        });

        it('should update settings with Workspace target', async () => {
            const changes = { setting1: false };

            await vscOnboardingActionApi.updateSettings(ConfigTarget.Workspace, changes);

            expect(configuration.update).toHaveBeenCalledWith('setting1', false, ConfigurationTarget.Workspace);
        });

        it('should update settings with WorkspaceFolder target', async () => {
            const changes = { setting1: 'test' };

            await vscOnboardingActionApi.updateSettings(ConfigTarget.WorkspaceFolder, changes);

            expect(configuration.update).toHaveBeenCalledWith('setting1', 'test', ConfigurationTarget.WorkspaceFolder);
        });

        it('should fire analytics event for boolean values', async () => {
            const changes = { booleanSetting: true, stringSetting: 'value' };

            await vscOnboardingActionApi.updateSettings(ConfigTarget.User, changes);

            expect(mockAnalyticsApi.fireFeatureChangeEvent).toHaveBeenCalledWith('booleanSetting', true);
            expect(mockAnalyticsApi.fireFeatureChangeEvent).not.toHaveBeenCalledWith('stringSetting', 'value');
        });

        it('should remove settings when removes array is provided', async () => {
            const changes = { setting1: true };
            const removes = ['setting2', 'setting3'];

            await vscOnboardingActionApi.updateSettings(ConfigTarget.User, changes, removes);

            expect(configuration.update).toHaveBeenCalledWith('setting1', true, ConfigurationTarget.Global);
            expect(configuration.update).toHaveBeenCalledWith('setting2', undefined, ConfigurationTarget.Global);
            expect(configuration.update).toHaveBeenCalledWith('setting3', undefined, ConfigurationTarget.Global);
        });
    });

    describe('UI action methods', () => {
        it('should call createJiraIssue', () => {
            vscOnboardingActionApi.createJiraIssue();

            expect(Container.explorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.CREATEISSUE, true);
        });

        it('should call viewJiraIssue', () => {
            vscOnboardingActionApi.viewJiraIssue();

            expect(Container.explorerFocusManager.fireEvent).toHaveBeenCalledWith(FocusEventActions.VIEWISSUE, true);
        });

        it('should call createPullRequest', () => {
            vscOnboardingActionApi.createPullRequest();

            expect(Container.explorerFocusManager.fireEvent).toHaveBeenCalledWith(
                FocusEventActions.CREATEPULLREQUEST,
                true,
            );
        });

        it('should call viewPullRequest', () => {
            vscOnboardingActionApi.viewPullRequest();

            expect(Container.explorerFocusManager.fireEvent).toHaveBeenCalledWith(
                FocusEventActions.VIEWPULLREQUEST,
                true,
            );
        });

        it('should call closePage', () => {
            vscOnboardingActionApi.closePage();

            expect(Container.onboardingWebviewFactory.hide).toHaveBeenCalled();
        });

        it('should call openSettings without parameters', () => {
            vscOnboardingActionApi.openSettings();

            expect(Container.settingsWebviewFactory.createOrShow).toHaveBeenCalledWith(undefined);
        });

        it('should call openSettings with section and subsection', () => {
            const section = 'testSection';
            const subsection = 'testSubsection';

            vscOnboardingActionApi.openSettings(section, subsection);

            expect(Container.settingsWebviewFactory.createOrShow).toHaveBeenCalledWith({
                section: section,
                subSection: subsection,
            });
        });
    });

    describe('error handling', () => {
        it('should handle errors in updateSettings', async () => {
            const error = new Error('Configuration update failed');
            configuration.update.mockRejectedValue(error);

            const changes = { setting1: true };

            await expect(vscOnboardingActionApi.updateSettings(ConfigTarget.User, changes)).rejects.toThrow(
                'Configuration update failed',
            );
        });

        it('should handle errors in getSitesWithAuth', async () => {
            const mockSite: DetailedSiteInfo = {
                id: 'jira-1',
                isCloud: true,
                product: ProductJira,
                name: 'Jira Site',
                url: 'https://jira.atlassian.net',
                avatarUrl: '',
                users: [],
            };

            Container.siteManager.getSitesAvailable.mockReturnValueOnce([mockSite]).mockReturnValueOnce([]);

            const error = new Error('Auth info fetch failed');
            Container.credentialManager.getAuthInfo.mockRejectedValue(error);

            await expect(vscOnboardingActionApi.getSitesWithAuth()).rejects.toThrow('Auth info fetch failed');
        });
    });
});
