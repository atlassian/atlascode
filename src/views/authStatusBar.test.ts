import { StatusBarAlignment, window } from 'vscode';

import {
    AuthInfo,
    AuthInfoState,
    DetailedSiteInfo,
    Product,
    ProductBitbucket,
    ProductJira,
} from '../atlclients/authInfo';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { Resources } from '../resources';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { AuthStatusBar } from './authStatusBar';

// Mock constants
jest.mock('../constants', () => ({
    Commands: {
        ShowJiraAuth: 'atlascode.showJiraAuth',
        ShowBitbucketAuth: 'atlascode.showBitbucketAuth',
    },
}));

// Mock Mustache
jest.mock('mustache', () => ({
    __esModule: true,
    default: {
        render: jest.fn().mockReturnValue('mocked template result'),
    },
}));

// Get the mock function for later use
const mockMustacheRender = require('mustache').default.render;

jest.mock('../container', () => ({
    Container: {
        siteManager: {
            onDidSitesAvailableChange: jest.fn().mockReturnValue({
                dispose: jest.fn(),
            }),
            getFirstSite: jest.fn(),
        },
        credentialManager: {
            getAuthInfo: jest.fn(),
        },
        config: {
            jira: {
                enabled: true,
                statusbar: {
                    enabled: true,
                    showLogin: true,
                },
            },
            bitbucket: {
                enabled: true,
                statusbar: {
                    enabled: true,
                    showLogin: true,
                },
            },
        },
    },
}));

jest.mock('../config/configuration', () => ({
    configuration: {
        onDidChange: jest.fn().mockReturnValue({
            dispose: jest.fn(),
        }),
        initializingChangeEvent: {},
        initializing: jest.fn(),
        changed: jest.fn(),
    },
}));

jest.mock('../resources', () => ({
    Resources: {
        html: new Map([['statusBarText', 'Template: {{product}} - {{user}}']]),
    },
}));

describe('AuthStatusBar', () => {
    let authStatusBar: AuthStatusBar;
    let mockSiteInfo: DetailedSiteInfo;
    let mockAuthInfo: AuthInfo;
    let mockStatusBarItem: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create fresh mock status bar item for each test
        mockStatusBarItem = {
            text: '',
            command: undefined,
            tooltip: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        };

        // Mock window.createStatusBarItem to return our mock
        (window.createStatusBarItem as jest.Mock) = jest.fn().mockReturnValue(mockStatusBarItem);

        // Reset Mustache mock
        mockMustacheRender.mockReturnValue('mocked template result');

        // Setup mock data
        mockSiteInfo = {
            id: 'test-site',
            name: 'Test Site',
            host: 'test.atlassian.net',
            product: ProductJira,
            userId: 'user123',
            avatarUrl: 'https://example.com/avatar.png',
        } as DetailedSiteInfo;

        mockAuthInfo = {
            user: {
                id: 'user123',
                displayName: 'John Doe',
                email: 'john@example.com',
                avatarUrl: 'https://example.com/avatar.png',
            },
            state: AuthInfoState.Valid,
        } as AuthInfo;

        // Reset Container mocks
        Container.siteManager.getFirstSite = jest.fn();
        Container.credentialManager.getAuthInfo = jest.fn();
    });

    afterEach(() => {
        if (authStatusBar) {
            authStatusBar.dispose();
        }
    });

    describe('constructor', () => {
        it('should initialize and set up event listeners', () => {
            authStatusBar = new AuthStatusBar();

            expect(Container.siteManager.onDidSitesAvailableChange).toHaveBeenCalledWith(
                expect.any(Function),
                authStatusBar,
            );
            expect(configuration.onDidChange).toHaveBeenCalledWith(expect.any(Function), authStatusBar);
        });
    });

    describe('onDidSitesChange', () => {
        it('should call generateStatusbarItem with the product from the event', async () => {
            authStatusBar = new AuthStatusBar();
            const spy = jest.spyOn(authStatusBar, 'generateStatusbarItem').mockResolvedValue();

            const event: SitesAvailableUpdateEvent = {
                product: ProductJira,
                sites: [],
            };

            authStatusBar.onDidSitesChange(event);

            expect(spy).toHaveBeenCalledWith(ProductJira);
        });
    });

    describe('generateStatusbarItem', () => {
        beforeEach(() => {
            authStatusBar = new AuthStatusBar();
        });

        it('should generate status bar for authenticated user', async () => {
            Container.siteManager.getFirstSite = jest.fn().mockReturnValue(mockSiteInfo);
            Container.credentialManager.getAuthInfo = jest.fn().mockResolvedValue(mockAuthInfo);
            const spy = jest.spyOn(authStatusBar as any, 'updateAuthenticationStatusBar').mockResolvedValue(undefined);

            await authStatusBar.generateStatusbarItem(ProductJira);

            expect(Container.siteManager.getFirstSite).toHaveBeenCalledWith(ProductJira.key);
            expect(Container.credentialManager.getAuthInfo).toHaveBeenCalledWith(mockSiteInfo);
            expect(spy).toHaveBeenCalledWith(ProductJira, mockAuthInfo);
        });

        it('should generate status bar for unauthenticated user', async () => {
            // Use empty site info instead of undefined to trigger the correct path
            const emptySiteInfo = {
                id: '',
                name: '',
                host: '',
                baseLinkUrl: '',
                baseApiUrl: '',
                product: ProductJira,
                userId: '',
                avatarUrl: '',
            } as DetailedSiteInfo;

            Container.siteManager.getFirstSite = jest.fn().mockReturnValue(emptySiteInfo);
            const spy = jest.spyOn(authStatusBar as any, 'updateAuthenticationStatusBar').mockResolvedValue(undefined);

            await authStatusBar.generateStatusbarItem(ProductJira);

            expect(Container.siteManager.getFirstSite).toHaveBeenCalledWith(ProductJira.key);
            expect(Container.credentialManager.getAuthInfo).not.toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(ProductJira, undefined);
        });
    });

    describe('onConfigurationChanged', () => {
        beforeEach(() => {
            authStatusBar = new AuthStatusBar();
        });

        it('should regenerate Jira status bar when Jira config changes', async () => {
            const spy = jest.spyOn(authStatusBar, 'generateStatusbarItem').mockResolvedValue();
            configuration.initializing = jest.fn().mockReturnValue(false);
            configuration.changed = jest
                .fn()
                .mockReturnValueOnce(true) // jira.statusbar
                .mockReturnValueOnce(false); // bitbucket.statusbar

            await (authStatusBar as any).onConfigurationChanged({});

            expect(spy).toHaveBeenCalledWith(ProductJira);
        });

        it('should regenerate Bitbucket status bar when Bitbucket config changes', async () => {
            const spy = jest.spyOn(authStatusBar, 'generateStatusbarItem').mockResolvedValue();
            configuration.initializing = jest.fn().mockReturnValue(false);
            configuration.changed = jest
                .fn()
                .mockReturnValueOnce(false) // jira.statusbar
                .mockReturnValueOnce(false) // jiraEnabled
                .mockReturnValueOnce(true) // bitbucket.statusbar
                .mockReturnValueOnce(false); // bitbucketEnabled

            await (authStatusBar as any).onConfigurationChanged({});

            expect(spy).toHaveBeenCalledWith(ProductBitbucket);
        });

        it('should regenerate both status bars when initializing', async () => {
            const spy = jest.spyOn(authStatusBar, 'generateStatusbarItem').mockResolvedValue();
            configuration.initializing = jest.fn().mockReturnValue(true);

            await (authStatusBar as any).onConfigurationChanged(configuration.initializingChangeEvent);

            expect(spy).toHaveBeenCalledWith(ProductJira);
            expect(spy).toHaveBeenCalledWith(ProductBitbucket);
        });
    });

    describe('ensureStatusItem', () => {
        beforeEach(() => {
            authStatusBar = new AuthStatusBar();
        });

        it('should create new status bar item for Jira', () => {
            const result = (authStatusBar as any).ensureStatusItem(ProductJira);

            expect(window.createStatusBarItem).toHaveBeenCalledWith(
                StatusBarAlignment.Left,
                AuthStatusBar.JiraStausBarItemPriority,
            );
            expect(result).toBe(mockStatusBarItem);
        });

        it('should create new status bar item for Bitbucket', () => {
            const result = (authStatusBar as any).ensureStatusItem(ProductBitbucket);

            expect(window.createStatusBarItem).toHaveBeenCalledWith(
                StatusBarAlignment.Left,
                AuthStatusBar.BitbucketStausBarItemPriority,
            );
            expect(result).toBe(mockStatusBarItem);
        });

        it('should return existing status bar item', () => {
            // This test should be run with a fresh instance to test the caching mechanism
            // The AuthStatusBar maintains an internal Map for status bar items
            const firstCall = (authStatusBar as any).ensureStatusItem(ProductJira);
            const secondCall = (authStatusBar as any).ensureStatusItem(ProductJira);

            // Since both calls are made on the same instance, it should reuse the item
            expect(firstCall).toBe(secondCall);

            // Verify the internal Map contains the cached item
            const map = (authStatusBar as any)._authenticationStatusBarItems;
            expect(map.has(ProductJira.key)).toBe(true);
            expect(map.get(ProductJira.key)).toBe(firstCall);
        });
    });

    describe('updateAuthenticationStatusBar', () => {
        beforeEach(() => {
            authStatusBar = new AuthStatusBar();
        });

        it('should show Jira status bar when enabled and authenticated', async () => {
            Container.config.jira.enabled = true;
            Container.config.jira.statusbar.enabled = true;
            const spy = jest.spyOn(authStatusBar as any, 'updateStatusBarItem').mockResolvedValue(undefined);

            await (authStatusBar as any).updateAuthenticationStatusBar(ProductJira, mockAuthInfo);

            expect(spy).toHaveBeenCalledWith(mockStatusBarItem, ProductJira, mockAuthInfo);
        });

        it('should hide status bar when product is disabled', async () => {
            Container.config.jira.enabled = false;

            await (authStatusBar as any).updateAuthenticationStatusBar(ProductJira, mockAuthInfo);

            expect(mockStatusBarItem.hide).toHaveBeenCalled();
        });

        it('should hide status bar when statusbar is disabled', async () => {
            Container.config.jira.enabled = true;
            Container.config.jira.statusbar.enabled = false;

            await (authStatusBar as any).updateAuthenticationStatusBar(ProductJira, mockAuthInfo);

            expect(mockStatusBarItem.hide).toHaveBeenCalled();
        });
    });

    describe('updateStatusBarItem', () => {
        beforeEach(() => {
            authStatusBar = new AuthStatusBar();
        });

        describe('Jira product', () => {
            it('should show authenticated user info', async () => {
                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductJira, mockAuthInfo);

                expect(mockMustacheRender).toHaveBeenCalledWith('Template: {{product}} - {{user}}', {
                    product: 'Jira',
                    user: 'John Doe',
                    ...Container.config.jira.statusbar,
                });
                expect(mockStatusBarItem.text).toBe('mocked template result');
                expect(mockStatusBarItem.command).toBe('atlascode.showJiraAuth');
                expect(mockStatusBarItem.tooltip).toBe('Jira');
                expect(mockStatusBarItem.show).toHaveBeenCalled();
            });

            it('should show sign-in prompt when not authenticated and showLogin is true', async () => {
                Container.config.jira.statusbar.showLogin = true;

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductJira, undefined);

                expect(mockStatusBarItem.text).toBe('$(sign-in) Sign in to Jira');
                expect(mockStatusBarItem.command).toBe('atlascode.showJiraAuth');
                expect(mockStatusBarItem.tooltip).toBe('Jira');
                expect(mockStatusBarItem.show).toHaveBeenCalled();
            });

            it('should hide status bar when not authenticated and showLogin is false', async () => {
                Container.config.jira.statusbar.showLogin = false;

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductJira, undefined);

                expect(mockStatusBarItem.hide).toHaveBeenCalled();
            });

            it('should show default text when template is not available', async () => {
                Resources.html.delete('statusBarText');

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductJira, mockAuthInfo);

                expect(mockStatusBarItem.text).toBe('$(person) Jira: John Doe');
                // When no template is available, command is not set for authenticated users
                expect(mockStatusBarItem.command).toBeUndefined();
                expect(mockStatusBarItem.show).toHaveBeenCalled();

                // Restore template for other tests
                Resources.html.set('statusBarText', 'Template: {{product}} - {{user}}');
            });
        });

        describe('Bitbucket product', () => {
            it('should show authenticated user info', async () => {
                // Ensure template is available
                Resources.html.set('statusBarText', 'Template: {{product}} - {{user}}');

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductBitbucket, mockAuthInfo);

                expect(mockMustacheRender).toHaveBeenCalledWith('Template: {{product}} - {{user}}', {
                    product: 'Bitbucket',
                    user: 'John Doe',
                    ...Container.config.bitbucket.statusbar,
                });
                expect(mockStatusBarItem.text).toBe('mocked template result');
                expect(mockStatusBarItem.command).toBe('atlascode.showBitbucketAuth');
                expect(mockStatusBarItem.tooltip).toBe('Bitbucket');
                expect(mockStatusBarItem.show).toHaveBeenCalled();
            });

            it('should show sign-in prompt when not authenticated and showLogin is true', async () => {
                Container.config.bitbucket.statusbar.showLogin = true;

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductBitbucket, undefined);

                expect(mockStatusBarItem.text).toBe('$(sign-in) Sign in to Bitbucket');
                expect(mockStatusBarItem.command).toBe('atlascode.showBitbucketAuth');
                expect(mockStatusBarItem.tooltip).toBe('Bitbucket');
                expect(mockStatusBarItem.show).toHaveBeenCalled();
            });

            it('should hide status bar when not authenticated and showLogin is false', async () => {
                Container.config.bitbucket.statusbar.showLogin = false;

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, ProductBitbucket, undefined);

                expect(mockStatusBarItem.hide).toHaveBeenCalled();
            });
        });

        describe('Unknown product', () => {
            it('should show unknown product message', async () => {
                const unknownProduct: Product = { key: 'unknown', name: 'Unknown' };

                await (authStatusBar as any).updateStatusBarItem(mockStatusBarItem, unknownProduct, mockAuthInfo);

                expect(mockStatusBarItem.text).toBe('$(person) Unknown Atlassian product Unknown');
                expect(mockStatusBarItem.command).toBeUndefined();
                expect(mockStatusBarItem.tooltip).toBe('Unknown');
                expect(mockStatusBarItem.show).toHaveBeenCalled();
            });
        });
    });

    describe('dispose', () => {
        it('should dispose all status bar items and disposables', () => {
            authStatusBar = new AuthStatusBar();

            // Create some status bar items
            (authStatusBar as any).ensureStatusItem(ProductJira);
            (authStatusBar as any).ensureStatusItem(ProductBitbucket);

            authStatusBar.dispose();

            expect(mockStatusBarItem.dispose).toHaveBeenCalledTimes(2);
        });
    });

    describe('static properties', () => {
        it('should have correct priority values', () => {
            expect(AuthStatusBar.JiraStausBarItemPriority).toBe(100);
            expect(AuthStatusBar.BitbucketStausBarItemPriority).toBe(90);
        });
    });
});
