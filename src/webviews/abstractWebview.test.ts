import * as vscode from 'vscode';

import { DetailedSiteInfo, Product } from '../atlclients/authInfo';
import { iconSet, Resources } from '../resources';
import { UIWebsocket } from '../ws';
import { AbstractReactWebview, InitializingWebview, isInitializable } from './abstractWebview';

// Mock the required modules and classes
jest.mock('../ws', () => ({
    UIWebsocket: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        send: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('../container', () => ({
    Container: {
        isDebugging: false,
        config: { enableUIWS: false },
        pmfStats: {
            shouldShowSurvey: jest.fn().mockReturnValue(false),
        },
        analyticsClient: {
            sendScreenEvent: jest.fn(),
            sendTrackEvent: jest.fn(),
        },
        featureFlagClient: {
            checkGate: jest.fn().mockReturnValue(false),
            checkExperimentValue: jest.fn().mockReturnValue(undefined),
        },
        analyticsApi: {
            fireUIErrorEvent: jest.fn(),
        },
    },
}));

jest.mock('../resources', () => ({
    Resources: {
        icons: {
            get: jest.fn(),
        },
        html: {
            get: jest.fn(),
        },
        htmlNotFound: 'Resource not found',
    },
    iconSet: {
        ATLASSIANICON: 'atlassianIcon',
    },
}));

jest.mock('fs', () => ({
    readFileSync: jest.fn().mockReturnValue(JSON.stringify({ 'main.js': 'main.js', 'main.css': 'main.css' })),
}));

// Mock Mustache
jest.mock('mustache', () => ({
    default: {
        render: jest.fn().mockImplementation((template, data) => {
            return template ? JSON.stringify(data) : 'Error: template not found';
        }),
    },
}));

// Mock implementation of AbstractReactWebview for testing
class TestReactWebview extends AbstractReactWebview {
    get title(): string {
        return 'Test Webview';
    }

    get id(): string {
        return 'testWebview';
    }

    async invalidate(): Promise<void> {
        return Promise.resolve();
    }

    get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }

    get productOrUndefined(): Product | undefined {
        return undefined;
    }
}

// Test implementation of InitializingWebview
class TestInitializingWebview implements InitializingWebview<string> {
    public initialized: boolean = false;
    public data: string | undefined;

    initialize(data: string): void {
        this.initialized = true;
        this.data = data;
    }
}

class MockWebviewPanel {
    webview = {
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn().mockReturnValue(true),
        html: '',
        asWebviewUri: jest.fn((uri) => uri),
        cspSource: 'csp-source',
    };
    onDidDispose = jest.fn();
    onDidChangeViewState = jest.fn();
    reveal = jest.fn();
    dispose = jest.fn();
    iconPath = undefined;
    visible = true;
}

describe('abstractWebview', () => {
    describe('ReactWebview interface', () => {
        it('should be implemented by AbstractReactWebview', () => {
            const webview = new TestReactWebview('/test/path');
            expect(webview).toBeDefined();
            expect(typeof webview.hide).toBe('function');
            expect(typeof webview.createOrShow).toBe('function');
            expect(typeof webview.onDidPanelDispose).toBe('function');
            expect(typeof webview.invalidate).toBe('function');
            expect(webview.dispose).toBeDefined();
        });
    });

    describe('InitializingWebview interface', () => {
        it('should define an initialize method', () => {
            const webview = new TestInitializingWebview();
            expect(typeof webview.initialize).toBe('function');

            webview.initialize('test data');
            expect(webview.initialized).toBe(true);
            expect(webview.data).toBe('test data');
        });
    });

    describe('isInitializable function', () => {
        it('should return true for objects implementing InitializingWebview', () => {
            const initializable = new TestInitializingWebview();
            expect(isInitializable(initializable)).toBe(true);
        });

        it('should return false for objects not implementing InitializingWebview', () => {
            const notInitializable = { foo: 'bar' };
            expect(isInitializable(notInitializable)).toBe(false);
        });

        it('should return false for null or undefined', () => {
            expect(isInitializable(null)).toBe(false);
            expect(isInitializable(undefined)).toBe(false);
        });
    });

    describe('AbstractReactWebview class', () => {
        let webview: TestReactWebview;
        const extensionPath = '/test/extension/path';

        beforeEach(() => {
            jest.clearAllMocks();
            webview = new TestReactWebview(extensionPath);
        });

        describe('constructor', () => {
            it('should initialize with the extension path', () => {
                expect(webview).toBeDefined();
                expect(UIWebsocket).toHaveBeenCalledWith(13988);
            });
        });

        describe('basic properties and methods', () => {
            it('should have the correct title and id', () => {
                expect(webview.title).toBe('Test Webview');
                expect(webview.id).toBe('testWebview');
            });

            it('should return visible state', () => {
                expect(webview.visible).toBe(false); // Initially false until panel is created
            });
        });

        describe('createOrShow', () => {
            const createWebviewPanelMock = vscode.window.createWebviewPanel as jest.Mock;

            beforeEach(() => {
                createWebviewPanelMock.mockReturnValue(new MockWebviewPanel());
            });

            it('should create a webview panel when none exists', async () => {
                await webview.createOrShow();

                expect(createWebviewPanelMock).toHaveBeenCalled();
                expect(webview.visible).toBe(true);
            });

            it('should reuse existing panel when one exists', async () => {
                await webview.createOrShow();
                const createCallCount = createWebviewPanelMock.mock.calls.length;

                await webview.createOrShow();
                expect(createWebviewPanelMock.mock.calls.length).toBe(createCallCount);
            });
        });

        describe('hide', () => {
            it('should dispose the panel if it exists', async () => {
                await webview.createOrShow();
                const panel = (webview as any)._panel;
                webview.hide();

                expect(panel.dispose).toHaveBeenCalled();
            });

            it('should do nothing if no panel exists', () => {
                webview.hide(); // Should not throw
            });
        });

        describe('setIconPath', () => {
            it('should set the icon path on the panel', async () => {
                await webview.createOrShow();
                //const panel = (webview as any)._panel;

                webview.setIconPath();
                expect(Resources.icons.get).toHaveBeenCalledWith(iconSet.ATLASSIANICON);
            });
        });

        describe('postMessage', () => {
            it('should post a message to the webview', async () => {
                await webview.createOrShow();
                const message = { type: 'test', data: 'test-data' };
                const result = (webview as any).postMessage(message);

                expect(result).toBe(true);
                expect((webview as any)._panel.webview.postMessage).toHaveBeenCalledWith(message);
            });

            it('should return false if no panel exists', () => {
                const message = { type: 'test', data: 'test-data' };
                const result = (webview as any).postMessage(message);

                expect(result).toBe(false);
            });
        });

        describe('dispose', () => {
            beforeEach(() => {
                (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(new MockWebviewPanel());
            });

            it('should dispose resources', async () => {
                await webview.createOrShow();

                const disposablePanelDisposeSpy = jest.spyOn((webview as any)._disposablePanel, 'dispose');
                const onDidPanelDisposeDisposeSpy = jest.spyOn((webview as any)._onDidPanelDispose, 'dispose');

                webview.dispose();

                expect(disposablePanelDisposeSpy).toHaveBeenCalled();
                expect(onDidPanelDisposeDisposeSpy).toHaveBeenCalled();
            });
        });
    });
});
