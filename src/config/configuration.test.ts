import { ConfigurationChangeEvent, ExtensionContext, workspace } from 'vscode';

import { ConfigNamespace, JiraCreateSiteAndProjectKey } from '../constants';
import { Configuration, configuration } from './configuration';
import { SiteIdAndProjectKey } from './model';

// Mock vscode module
jest.mock('vscode', () => ({
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
    },
    workspace: {
        onDidChangeConfiguration: jest.fn(),
        getConfiguration: jest.fn(),
    },
    Disposable: class {
        private _callOnDispose?: () => void;
        constructor(callOnDispose?: () => void) {
            this._callOnDispose = callOnDispose;
        }
        dispose() {
            if (this._callOnDispose) {
                this._callOnDispose();
            }
        }
    },
    EventEmitter: class {
        private _listeners: any[] = [];
        get event() {
            return (listener: any) => {
                this._listeners.push(listener);
                return { dispose: () => {} };
            };
        }
        fire(data: any) {
            this._listeners.forEach((listener) => listener(data));
        }
        dispose() {
            this._listeners = [];
        }
    },
}));

describe('Configuration', () => {
    let mockWorkspace: any;
    let mockConfiguration: any;
    let mockContext: ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfiguration = {
            get: jest.fn(),
            inspect: jest.fn(),
            update: jest.fn(),
        };

        mockWorkspace = workspace as any;
        mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration);
        mockWorkspace.onDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });

        mockContext = {
            subscriptions: [],
        } as any;
    });

    describe('static configure', () => {
        it('should register configuration change listener', () => {
            Configuration.configure(mockContext);

            expect(mockWorkspace.onDidChangeConfiguration).toHaveBeenCalledWith(expect.any(Function), configuration);
            expect(mockContext.subscriptions).toHaveLength(1);
        });
    });

    describe('constructor and dispose', () => {
        it('should create instance with proper event emitter setup', () => {
            const config = new Configuration();

            expect(config).toBeInstanceOf(Configuration);
            expect(config.onDidChange).toBeDefined();
        });

        it('should dispose event emitter when disposed', () => {
            const config = new Configuration();
            const disposeSpy = jest.spyOn(config['_onDidChange'], 'dispose');

            config.dispose();

            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('onConfigurationChanged', () => {
        let config: Configuration;
        let mockChangeEvent: ConfigurationChangeEvent;

        beforeEach(() => {
            config = new Configuration();
            mockChangeEvent = {
                affectsConfiguration: jest.fn().mockReturnValue(false),
            } as any;
        });

        it('should fire event when configuration affects our namespace', () => {
            (mockChangeEvent.affectsConfiguration as jest.Mock).mockReturnValue(true);
            const fireSpy = jest.spyOn(config['_onDidChange'], 'fire');

            (config as any).onConfigurationChanged(mockChangeEvent);

            expect(mockChangeEvent.affectsConfiguration).toHaveBeenCalledWith(ConfigNamespace, null);
            expect(fireSpy).toHaveBeenCalledWith(mockChangeEvent);
        });

        it('should not fire event when configuration does not affect our namespace', () => {
            (mockChangeEvent.affectsConfiguration as jest.Mock).mockReturnValue(false);
            const fireSpy = jest.spyOn(config['_onDidChange'], 'fire');

            (config as any).onConfigurationChanged(mockChangeEvent);

            expect(mockChangeEvent.affectsConfiguration).toHaveBeenCalledWith(ConfigNamespace, null);
            expect(fireSpy).not.toHaveBeenCalled();
        });
    });

    describe('initializing', () => {
        let config: Configuration;

        beforeEach(() => {
            config = new Configuration();
        });

        it('should return true for initializing change event', () => {
            const result = config.initializing(config.initializingChangeEvent);

            expect(result).toBe(true);
        });

        it('should return false for non-initializing change event', () => {
            const mockEvent = { affectsConfiguration: jest.fn() } as any;

            const result = config.initializing(mockEvent);

            expect(result).toBe(false);
        });
    });

    describe('setLastCreateSiteAndProject', () => {
        let config: Configuration;

        beforeEach(() => {
            config = new Configuration();
            jest.spyOn(config, 'updateEffective').mockResolvedValue();
        });

        it('should call updateEffective with correct parameters', async () => {
            const siteAndProject: SiteIdAndProjectKey = { siteId: 'site1', projectKey: 'PROJ' };

            await config.setLastCreateSiteAndProject(siteAndProject);

            expect(config.updateEffective).toHaveBeenCalledWith(
                JiraCreateSiteAndProjectKey,
                siteAndProject,
                null,
                true,
            );
        });

        it('should handle undefined siteAndProject', async () => {
            await config.setLastCreateSiteAndProject(undefined);

            expect(config.updateEffective).toHaveBeenCalledWith(JiraCreateSiteAndProjectKey, undefined, null, true);
        });
    });
});
