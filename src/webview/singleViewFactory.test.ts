import { Disposable, Uri, ViewColumn, window } from 'vscode';

import { Container } from '../container';
import { CommonActionType } from '../lib/ipc/fromUI/common';
import { CommonMessageType } from '../lib/ipc/toUI/common';
import { Experiments, Features } from '../util/features';
import { UIWebsocket } from '../ws';
import { SingleWebview } from './singleViewFactory';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        createWebviewPanel: jest.fn(),
    },
    ViewColumn: {
        Active: 1,
        One: 1,
        Two: 2,
        Three: 3,
    },
    Uri: {
        file: jest.fn(),
    },
    Disposable: {
        from: jest.fn(),
    },
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('../container', () => ({
    Container: {
        isDebugging: false,
        config: {
            enableUIWS: false,
        },
        pmfStats: {
            shouldShowSurvey: jest.fn(),
        },
    },
}));

jest.mock('../util/featureFlags', () => ({
    FeatureFlagClient: {
        checkGate: jest.fn(),
        checkExperimentValue: jest.fn(),
    },
}));

jest.mock('../ws', () => ({
    UIWebsocket: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        send: jest.fn(),
        dispose: jest.fn(),
    })),
}));

// Mock implementations
const mockWebviewPanel = {
    dispose: jest.fn(),
    reveal: jest.fn(),
    onDidDispose: jest.fn(),
    onDidChangeViewState: jest.fn(),
    webview: {
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn(),
        html: '',
        asWebviewUri: jest.fn(),
        cspSource: 'csp-source',
    },
    title: '',
    iconPath: undefined,
    visible: true,
};

const mockController = {
    title: jest.fn().mockReturnValue('Test Title'),
    update: jest.fn(),
    onShown: jest.fn(),
    onMessageReceived: jest.fn(),
    screenDetails: jest.fn().mockReturnValue({
        id: 'test-screen',
        site: 'test-site',
        product: 'test-product',
    }),
    requiredFeatureFlags: [] as Features[],
    requiredExperiments: [] as Experiments[],
};

const mockControllerFactory = {
    createController: jest.fn().mockReturnValue([mockController, undefined]),
    tabIcon: jest.fn().mockReturnValue(undefined),
    webviewHtml: jest.fn().mockReturnValue('<html></html>'),
    uiWebsocketPort: jest.fn().mockReturnValue(3000),
};

const mockAnalyticsApi = {
    fireViewScreenEvent: jest.fn(),
};

const mockDisposable = {
    dispose: jest.fn(),
};

describe('SingleWebview', () => {
    let singleWebview: SingleWebview<any, any>;
    let extensionPath: string;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mocks
        (window.createWebviewPanel as jest.Mock).mockReturnValue(mockWebviewPanel);
        (Uri.file as jest.Mock).mockReturnValue({ scheme: 'file', path: '/test' });
        (Disposable.from as jest.Mock).mockReturnValue(mockDisposable);

        // Setup container mocks
        (Container.isDebugging as any) = false;
        (Container.config as any) = { enableUIWS: false };
        (Container.pmfStats.shouldShowSurvey as jest.Mock).mockReturnValue(false);

        (Container.featureFlagClient as any) = {
            checkGate: jest.fn().mockReturnValue(false),
            checkExperimentValue: jest.fn().mockReturnValue(false),
        };

        extensionPath = '/test/extension/path';
        singleWebview = new SingleWebview(extensionPath, mockControllerFactory as any, mockAnalyticsApi as any);
    });

    afterEach(() => {
        singleWebview.dispose();
    });

    describe('constructor', () => {
        it('should create instance with correct properties', () => {
            expect(singleWebview).toBeInstanceOf(SingleWebview);
            expect(UIWebsocket).toHaveBeenCalledWith(3000);
        });
    });

    describe('onDidPanelDispose', () => {
        it('should return event emitter event', () => {
            const event = singleWebview.onDidPanelDispose();
            expect(event).toBeDefined();
        });
    });

    describe('hide', () => {
        it('should do nothing when panel is undefined', () => {
            singleWebview.hide();
            expect(mockWebviewPanel.dispose).not.toHaveBeenCalled();
        });

        it('should dispose panel when panel exists', async () => {
            await singleWebview.createOrShow();
            singleWebview.hide();
            expect(mockWebviewPanel.dispose).toHaveBeenCalled();
        });
    });

    describe('createOrShow', () => {
        it('should create new panel when panel is undefined', async () => {
            const factoryData = { test: 'data' };
            const column = ViewColumn.One;

            await singleWebview.createOrShow(factoryData, column);

            expect(window.createWebviewPanel).toHaveBeenCalledWith('react', '', column, {
                retainContextWhenHidden: true,
                enableFindWidget: true,
                enableCommandUris: true,
                enableScripts: true,
                localResourceRoots: [
                    { scheme: 'file', path: '/test' },
                    { scheme: 'file', path: '/test' },
                ],
            });

            expect(mockControllerFactory.createController).toHaveBeenCalledWith(expect.any(Function), factoryData);

            expect(mockController.onShown).toHaveBeenCalledWith(mockWebviewPanel);
            expect(mockAnalyticsApi.fireViewScreenEvent).toHaveBeenCalledWith(
                'test-screen',
                'test-site',
                'test-product',
            );
        });

        it('should use Active column when column is not provided', async () => {
            await singleWebview.createOrShow();

            expect(window.createWebviewPanel).toHaveBeenCalledWith('react', '', ViewColumn.Active, expect.any(Object));
        });

        it('should update existing panel when panel already exists', async () => {
            const factoryData1 = { test: 'data1' };
            const factoryData2 = { test: 'data2' };

            // Create initial panel
            await singleWebview.createOrShow(factoryData1);
            jest.clearAllMocks();

            // Update existing panel
            await singleWebview.createOrShow(factoryData2, ViewColumn.Two);

            expect(window.createWebviewPanel).not.toHaveBeenCalled();
            expect(mockController.update).toHaveBeenCalledWith(factoryData2);
            expect(mockWebviewPanel.reveal).toHaveBeenCalledWith(ViewColumn.Two);
        });

        it('should start websocket when debugging and UI websocket is enabled', async () => {
            (Container.isDebugging as any) = true;
            (Container.config as any) = { enableUIWS: true };

            const mockWs = {
                start: jest.fn(),
                send: jest.fn(),
                dispose: jest.fn(),
            };
            (UIWebsocket as jest.Mock).mockReturnValue(mockWs);

            const newSingleWebview = new SingleWebview(
                extensionPath,
                mockControllerFactory as any,
                mockAnalyticsApi as any,
            );

            await newSingleWebview.createOrShow();

            expect(mockWs.start).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should fire feature gates and experiment gates', async () => {
            const requiredFeatures = [Features.EnableErrorTelemetry];

            mockController.requiredFeatureFlags = requiredFeatures;

            (Container.featureFlagClient.checkGate as jest.Mock).mockReturnValue(true);
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue('test-value');

            await singleWebview.createOrShow();

            expect(Container.featureFlagClient.checkGate).toHaveBeenCalledWith(Features.EnableErrorTelemetry);
        });
    });

    describe('postMessage', () => {
        it('should return false when panel is undefined', async () => {
            const result = await singleWebview.postMessage({ test: 'message' });
            expect(result).toBe(false);
        });

        it('should post message to panel webview when panel exists', async () => {
            await singleWebview.createOrShow();

            const message = { test: 'message' };
            mockWebviewPanel.webview.postMessage.mockResolvedValue(true);

            const result = await singleWebview.postMessage(message);

            expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(message);
            expect(result).toBe(true);
        });

        it('should send message via websocket when debugging and UI websocket is enabled', async () => {
            (Container.isDebugging as any) = true;
            (Container.config as any) = { enableUIWS: true };

            const mockWs = {
                start: jest.fn(),
                send: jest.fn(),
                dispose: jest.fn(),
            };
            (UIWebsocket as jest.Mock).mockReturnValue(mockWs);

            const newSingleWebview = new SingleWebview(
                extensionPath,
                mockControllerFactory as any,
                mockAnalyticsApi as any,
            );

            await newSingleWebview.createOrShow();

            const message = { test: 'message' };
            await newSingleWebview.postMessage(message);

            expect(mockWs.send).toHaveBeenCalledWith(message);
        });
    });

    describe('message handling', () => {
        it('should handle refresh message and send PMF status', async () => {
            await singleWebview.createOrShow();

            const refreshMessage = { type: CommonActionType.Refresh };

            (Container.pmfStats.shouldShowSurvey as jest.Mock).mockReturnValue(true);
            mockWebviewPanel.webview.postMessage.mockResolvedValue(true);

            // Call the method directly on the instance to maintain proper context
            (singleWebview as any).onMessageReceived(refreshMessage);

            expect(mockController.onMessageReceived).toHaveBeenCalledWith(refreshMessage);
            // Check that PMF message was posted
            expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith({
                type: CommonMessageType.PMFStatus,
                showPMF: true,
            });
            expect(mockAnalyticsApi.fireViewScreenEvent).toHaveBeenCalledWith(
                'atlascodePmfBanner',
                'test-site',
                'test-product',
            );
        });

        it('should handle non-refresh messages', async () => {
            await singleWebview.createOrShow();

            const testMessage = { type: 'test-message', data: 'test' };

            // Call the method directly on the instance to maintain proper context
            (singleWebview as any).onMessageReceived(testMessage);

            expect(mockController.onMessageReceived).toHaveBeenCalledWith(testMessage);
        });
    });

    describe('panel disposal', () => {
        it('should handle panel disposal correctly', async () => {
            await singleWebview.createOrShow();

            // Call the method directly on the instance to maintain proper context
            (singleWebview as any).onPanelDisposed();

            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });

    describe('view state changes', () => {
        it('should handle view state changes', async () => {
            await singleWebview.createOrShow();

            const onViewStateChanged = mockWebviewPanel.onDidChangeViewState.mock.calls[0][0];
            const event = { webviewPanel: { visible: true } };

            // Should not throw
            expect(() => onViewStateChanged(event)).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should dispose all resources', () => {
            singleWebview.dispose();

            // Should be able to call dispose multiple times without error
            expect(() => singleWebview.dispose()).not.toThrow();
        });

        it('should dispose panel and controller when they exist', async () => {
            await singleWebview.createOrShow();

            singleWebview.dispose();

            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });

    describe('feature gates', () => {
        it('should not fire feature gates when no features required', async () => {
            mockController.requiredFeatureFlags = [];

            await singleWebview.createOrShow();

            expect(Container.featureFlagClient.checkGate).not.toHaveBeenCalled();
        });

        it('should fire multiple feature gates', async () => {
            const features = [Features.EnableErrorTelemetry];
            mockController.requiredFeatureFlags = features;

            (Container.featureFlagClient.checkGate as jest.Mock).mockReturnValue(true);

            await singleWebview.createOrShow();

            expect(Container.featureFlagClient.checkGate).toHaveBeenCalledTimes(1);
            expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith({
                command: CommonMessageType.UpdateFeatureFlags,
                featureFlags: {
                    [Features.EnableErrorTelemetry]: true,
                },
            });
        });
    });

    describe('experiment gates', () => {
        it('should not fire experiment gates when no experiments required', async () => {
            mockController.requiredExperiments = [];

            await singleWebview.createOrShow();

            expect(Container.featureFlagClient.checkExperimentValue).not.toHaveBeenCalled();
        });

        it('should fire multiple experiment gates', async () => {
            const experiments = ['very-long-experiment-name'] as unknown as Experiments[];
            mockController.requiredExperiments = experiments;

            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue('test-value');

            await singleWebview.createOrShow();

            expect(Container.featureFlagClient.checkExperimentValue).toHaveBeenCalledTimes(1);
            expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith({
                command: CommonMessageType.UpdateExperimentValues,
                experimentValues: {
                    ['very-long-experiment-name']: 'test-value',
                },
            });
        });
    });
});
