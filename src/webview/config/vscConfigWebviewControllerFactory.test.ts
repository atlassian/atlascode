import { Disposable, Uri } from 'vscode';

import { Container } from '../../container';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { ConfigSection, ConfigSubSection } from '../../lib/ipc/models/config';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { SectionChangeMessage } from '../../lib/ipc/toUI/config';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { ConfigActionApi } from '../../lib/webview/controller/config/configActionApi';
import { ConfigWebviewController, id } from '../../lib/webview/controller/config/configWebviewController';
import { Logger } from '../../logger';
import { iconSet } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { VSCConfigWebviewControllerFactory } from './vscConfigWebviewControllerFactory';

// Mock all external dependencies
jest.mock('vscode');
jest.mock('../../container');
jest.mock('../../lib/analyticsApi');
jest.mock('../../lib/webview/controller/common/commonActionMessageHandler');
jest.mock('../../lib/webview/controller/config/configActionApi');
jest.mock('../../lib/webview/controller/config/configWebviewController');
jest.mock('../../logger');
jest.mock('../../resources');
jest.mock('../common/getHtmlForView');

describe('VSCConfigWebviewControllerFactory', () => {
    let factory: VSCConfigWebviewControllerFactory;
    let mockConfigActionApi: jest.Mocked<ConfigActionApi>;
    let mockCommonHandler: jest.Mocked<CommonActionMessageHandler>;
    let mockAnalyticsApi: jest.Mocked<AnalyticsApi>;
    let mockPostMessage: jest.Mock;
    let mockSiteManager: any;
    let mockController: jest.Mocked<ConfigWebviewController>;
    let mockDisposable: jest.Mocked<Disposable>;

    const settingsUrl = 'https://test-settings.com';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock dependencies
        mockConfigActionApi = {} as jest.Mocked<ConfigActionApi>;
        mockCommonHandler = {} as jest.Mocked<CommonActionMessageHandler>;
        mockAnalyticsApi = {} as jest.Mocked<AnalyticsApi>;
        mockPostMessage = jest.fn();

        // Mock Container.siteManager
        mockSiteManager = {
            onDidSitesAvailableChange: jest.fn().mockReturnValue({
                dispose: jest.fn(),
            }),
        };
        (Container as any).siteManager = mockSiteManager;

        // Mock ConfigWebviewController
        mockController = {
            onSitesChanged: jest.fn(),
        } as any;
        (ConfigWebviewController as jest.Mock).mockReturnValue(mockController);

        // Mock Disposable.from
        mockDisposable = {
            dispose: jest.fn(),
        } as jest.Mocked<Disposable>;

        // Mock the vscode module's Disposable.from method
        const vscode = require('vscode');
        vscode.Disposable = {
            from: jest.fn().mockReturnValue(mockDisposable),
        };

        // Mock Resources.icons.get
        const mockUri = { toString: () => 'mock-uri' } as Uri;
        const resources = require('../../resources');
        resources.Resources = {
            icons: {
                get: jest.fn().mockReturnValue(mockUri),
            },
        };

        // Mock getHtmlForView
        (getHtmlForView as jest.Mock).mockReturnValue('<html>Mock HTML</html>');

        // Create factory instance
        factory = new VSCConfigWebviewControllerFactory(
            mockConfigActionApi,
            mockCommonHandler,
            mockAnalyticsApi,
            settingsUrl,
        );
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(factory).toBeInstanceOf(VSCConfigWebviewControllerFactory);
        });
    });

    describe('tabIcon', () => {
        it('should return the Atlassian icon from resources', () => {
            const result = factory.tabIcon();

            const resources = require('../../resources');
            expect(resources.Resources.icons.get).toHaveBeenCalledWith(iconSet.ATLASSIANICON);
            expect(result).toEqual({ toString: expect.any(Function) });
        });
    });

    describe('uiWebsocketPort', () => {
        it('should return the Settings UI websocket port', () => {
            const result = factory.uiWebsocketPort();

            expect(result).toBe(UIWSPort.Settings);
        });
    });

    describe('createController', () => {
        it('should create a ConfigWebviewController with correct parameters', () => {
            const factoryData: SectionChangeMessage = {
                section: ConfigSection.Jira,
                subSection: ConfigSubSection.Auth,
            };

            const result = factory.createController(mockPostMessage, factoryData);

            expect(ConfigWebviewController).toHaveBeenCalledWith(
                mockPostMessage,
                mockConfigActionApi,
                mockCommonHandler,
                Logger.Instance,
                mockAnalyticsApi,
                settingsUrl,
                factoryData,
            );

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBe(mockController);
            expect(result[1]).toBe(mockDisposable);
        });

        it('should create a ConfigWebviewController without factory data', () => {
            const result = factory.createController(mockPostMessage);

            expect(ConfigWebviewController).toHaveBeenCalledWith(
                mockPostMessage,
                mockConfigActionApi,
                mockCommonHandler,
                Logger.Instance,
                mockAnalyticsApi,
                settingsUrl,
                undefined,
            );

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBe(mockController);
            expect(result[1]).toBe(mockDisposable);
        });

        it('should set up site manager change listener', () => {
            factory.createController(mockPostMessage);

            expect(mockSiteManager.onDidSitesAvailableChange).toHaveBeenCalledWith(
                mockController.onSitesChanged,
                mockController,
            );
            const vscode = require('vscode');
            expect(vscode.Disposable.from).toHaveBeenCalled();
        });
    });

    describe('webviewHtml', () => {
        it('should return HTML for the config view', () => {
            const extensionPath = '/path/to/extension';
            const baseUri = Uri.parse('file:///base');
            const cspSource = 'test-csp-source';

            const result = factory.webviewHtml(extensionPath, baseUri, cspSource);

            expect(getHtmlForView).toHaveBeenCalledWith(extensionPath, baseUri, cspSource, id);
            expect(result).toBe('<html>Mock HTML</html>');
        });
    });

    describe('interface compliance', () => {
        it('should implement VSCWebviewControllerFactory interface', () => {
            // Test that all required methods exist
            expect(typeof factory.tabIcon).toBe('function');
            expect(typeof factory.uiWebsocketPort).toBe('function');
            expect(typeof factory.createController).toBe('function');
            expect(typeof factory.webviewHtml).toBe('function');
        });
    });
});
