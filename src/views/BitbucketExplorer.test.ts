import { ConfigurationChangeEvent, Disposable } from 'vscode';
import * as vscode from 'vscode';

import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { configuration } from '../config/configuration';
import { Commands } from '../constants';
import { BitbucketEnabledKey } from '../constants';
import { Container } from '../container';
import { FocusEvent, FocusEventActions } from '../webview/ExplorerFocusManager';
import { BitbucketActivityMonitor } from './BitbucketActivityMonitor';
import { BitbucketExplorer } from './BitbucketExplorer';
import { BaseTreeDataProvider } from './Explorer';
import { CreatePullRequestNode } from './pullrequest/headerNode';
import { DescriptionNode, PullRequestTitlesNode } from './pullrequest/pullRequestNode';
import { PullRequestNodeDataProvider } from './pullRequestNodeDataProvider';
import { RefreshTimer } from './RefreshTimer';

// Mock all dependencies
jest.mock('../config/configuration');
jest.mock('../container');
jest.mock('../bitbucket/bbContext');
jest.mock('./RefreshTimer');
jest.mock('./pullRequestNodeDataProvider');

// Create a concrete implementation for testing
class TestBitbucketExplorer extends BitbucketExplorer {
    viewId(): string {
        return 'test.view';
    }

    explorerEnabledConfiguration(): string {
        return 'test.explorer.enabled';
    }

    monitorEnabledConfiguration(): string {
        return 'test.monitor.enabled';
    }

    refreshConfiguration(): string {
        return 'test.refresh';
    }

    onConfigurationChanged(e: ConfigurationChangeEvent): void {
        // Test implementation
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new PullRequestNodeDataProvider({} as any);
    }

    newMonitor(): BitbucketActivityMonitor {
        return {
            checkForNewActivity: jest.fn(),
        } as any;
    }
}

describe('BitbucketExplorer', () => {
    let explorer: TestBitbucketExplorer;
    let mockContext: jest.Mocked<BitbucketContext>;
    let mockRefreshTimer: jest.Mocked<RefreshTimer>;
    let mockActivityMonitor: jest.Mocked<BitbucketActivityMonitor>;
    let mockTreeDataProvider: jest.Mocked<PullRequestNodeDataProvider>;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup VSCode mocks
        const mockTreeView = {
            onDidChangeVisibility: jest.fn(),
        };

        (vscode.window.createTreeView as jest.Mock).mockReturnValue(mockTreeView);
        (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

        // Setup mocks
        mockContext = {
            onDidChangeBitbucketContext: jest.fn().mockReturnValue(new Disposable(() => {})),
        } as any;

        // Mock configuration
        (configuration as any).onDidChange = jest.fn().mockReturnValue(new Disposable(() => {}));
        (configuration as any).get = jest.fn();
        (configuration as any).changed = jest.fn();
        (configuration as any).initializing = jest.fn();
        (configuration as any).initializingChangeEvent = {} as any;

        // Mock Container
        (Container as any).context = {
            subscriptions: [],
        };
        (Container as any).explorerFocusManager = {
            onFocusEvent: jest.fn().mockReturnValue(new Disposable(() => {})),
        };
        (Container as any).siteManager = {
            productHasAtLeastOneSite: jest.fn(),
        };
        (Container as any).credentialManager = {
            getAllValidAuthInfo: jest.fn(),
        };

        mockRefreshTimer = {
            dispose: jest.fn(),
        } as any;
        (RefreshTimer as jest.MockedClass<typeof RefreshTimer>).mockImplementation(() => mockRefreshTimer);

        mockActivityMonitor = {
            checkForNewActivity: jest.fn(),
        } as any;

        mockTreeDataProvider = {
            refresh: jest.fn(),
            dispose: jest.fn(),
            getFirstPullRequestNode: jest.fn(),
            getDetailsNode: jest.fn(),
            getCreatePullRequestNode: jest.fn(),
        } as any;
        (PullRequestNodeDataProvider as jest.MockedClass<typeof PullRequestNodeDataProvider>).mockImplementation(
            () => mockTreeDataProvider,
        );
    });

    afterEach(() => {
        if (explorer) {
            explorer.dispose();
        }
    });

    describe('constructor', () => {
        it('should initialize with proper dependencies', () => {
            explorer = new TestBitbucketExplorer(mockContext);

            expect(mockContext.onDidChangeBitbucketContext).toHaveBeenCalled();
            expect((Container as any).explorerFocusManager.onFocusEvent).toHaveBeenCalled();
            expect(RefreshTimer).toHaveBeenCalled();
            expect((configuration as any).onDidChange).toHaveBeenCalled();
        });

        it('should call _onConfigurationChanged with initialization event', () => {
            const spy = jest.spyOn(TestBitbucketExplorer.prototype as any, '_onConfigurationChanged');
            explorer = new TestBitbucketExplorer(mockContext);

            expect(spy).toHaveBeenCalledWith((configuration as any).initializingChangeEvent);
        });
    });

    describe('product', () => {
        it('should return ProductBitbucket', () => {
            explorer = new TestBitbucketExplorer(mockContext);
            expect(explorer.product()).toBe(ProductBitbucket);
        });
    });

    describe('bitbucketEnabledConfiguration', () => {
        it('should return BitbucketEnabledKey', () => {
            explorer = new TestBitbucketExplorer(mockContext);
            expect(explorer.bitbucketEnabledConfiguration()).toBe(BitbucketEnabledKey);
        });
    });

    describe('onBitbucketContextChanged', () => {
        it('should call updateMonitor', () => {
            explorer = new TestBitbucketExplorer(mockContext);
            const spy = jest.spyOn(explorer as any, 'updateMonitor');

            explorer.onBitbucketContextChanged();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        beforeEach(() => {
            explorer = new TestBitbucketExplorer(mockContext);
        });

        it('should return early if no authenticated sites available', async () => {
            (Container as any).credentialManager.getAllValidAuthInfo.mockResolvedValue([]);

            await explorer.refresh();

            expect((Container as any).credentialManager.getAllValidAuthInfo).toHaveBeenCalledWith(ProductBitbucket);
            // Should not call refresh or checkForNewActivity when no authenticated sites
            expect(mockTreeDataProvider.refresh).not.toHaveBeenCalled();
        });

        it('should refresh tree data provider when authenticated sites exist', async () => {
            (Container as any).credentialManager.getAllValidAuthInfo.mockResolvedValue([{ user: { id: 'user1' } }]);
            explorer['treeDataProvider'] = mockTreeDataProvider;

            await explorer.refresh();

            expect(mockTreeDataProvider.refresh).toHaveBeenCalled();
        });

        it('should check for new activity when monitor is available and enabled', async () => {
            (Container as any).credentialManager.getAllValidAuthInfo.mockResolvedValue([{ user: { id: 'user1' } }]);
            (configuration as any).get.mockReturnValue(true);
            explorer['monitor'] = mockActivityMonitor;

            await explorer.refresh();

            expect(mockActivityMonitor.checkForNewActivity).toHaveBeenCalled();
        });

        it('should not check for activity when bitbucket is disabled', async () => {
            (Container as any).credentialManager.getAllValidAuthInfo.mockResolvedValue([{ user: { id: 'user1' } }]);
            (configuration as any).get.mockReturnValue(false);
            explorer['monitor'] = mockActivityMonitor;

            await explorer.refresh();

            expect(mockActivityMonitor.checkForNewActivity).not.toHaveBeenCalled();
        });

        it('should not check for activity when no authenticated sites', async () => {
            (Container as any).credentialManager.getAllValidAuthInfo.mockResolvedValue([]);
            (configuration as any).get.mockReturnValue(true);
            explorer['monitor'] = mockActivityMonitor;

            await explorer.refresh();

            expect(mockActivityMonitor.checkForNewActivity).not.toHaveBeenCalled();
        });
    });

    describe('_onConfigurationChanged', () => {
        let mockChangeEvent: ConfigurationChangeEvent;

        beforeEach(() => {
            mockChangeEvent = {} as ConfigurationChangeEvent;
            explorer = new TestBitbucketExplorer(mockContext);
        });

        it('should create new tree data provider when explorer is enabled', async () => {
            (configuration as any).initializing.mockReturnValue(false);
            (configuration as any).changed.mockReturnValue(true);
            (configuration as any).get.mockReturnValue(true);
            const spy = jest.spyOn(explorer as any, 'newTreeView');

            await (explorer as any)._onConfigurationChanged(mockChangeEvent);

            expect(spy).toHaveBeenCalled();
            expect(explorer['treeDataProvider']).toBeDefined();
        });

        it('should clear tree data provider when explorer is disabled', async () => {
            (configuration as any).initializing.mockReturnValue(false);
            (configuration as any).changed.mockReturnValue(true);
            (configuration as any).get.mockReturnValue(false);
            explorer['treeDataProvider'] = mockTreeDataProvider;

            await (explorer as any)._onConfigurationChanged(mockChangeEvent);

            expect(mockTreeDataProvider.dispose).toHaveBeenCalled();
            expect(explorer['treeDataProvider']).toBeUndefined();
        });

        it('should update monitor when monitor configuration changes', async () => {
            (configuration as any).initializing.mockReturnValue(false);
            (configuration as any).changed.mockImplementation(
                (e: any, key: any) => key === 'test.monitor.enabled' || key === 'test.explorer.enabled',
            );
            const spy = jest.spyOn(explorer as any, 'updateMonitor');

            await (explorer as any)._onConfigurationChanged(mockChangeEvent);

            expect(spy).toHaveBeenCalled();
        });

        it('should refresh tree data provider when preferred remotes change', async () => {
            (configuration as any).initializing.mockReturnValue(false);
            (configuration as any).changed.mockImplementation(
                (e: any, key: any) => key === 'bitbucket.preferredRemotes',
            );
            explorer['treeDataProvider'] = mockTreeDataProvider;

            await (explorer as any)._onConfigurationChanged(mockChangeEvent);

            expect(mockTreeDataProvider.refresh).toHaveBeenCalled();
        });
    });

    describe('attemptDetailsNodeExpansionNTimes', () => {
        beforeEach(() => {
            explorer = new TestBitbucketExplorer(mockContext);
            explorer['treeDataProvider'] = mockTreeDataProvider;
            jest.useFakeTimers();

            // Make the mock data provider pass instanceof check
            Object.setPrototypeOf(mockTreeDataProvider, PullRequestNodeDataProvider.prototype);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should reveal first PR node when remaining attempts is 0', async () => {
            const mockPRNode = {} as PullRequestTitlesNode;
            mockTreeDataProvider.getFirstPullRequestNode.mockResolvedValue(mockPRNode);
            const spy = jest.spyOn(explorer, 'reveal').mockResolvedValue();

            await explorer.attemptDetailsNodeExpansionNTimes(0, 1000, false);

            expect(mockTreeDataProvider.getFirstPullRequestNode).toHaveBeenCalledWith(true);
            expect(spy).toHaveBeenCalledWith(mockPRNode, { focus: true });
        });

        it('should reveal PR node and details node when found', (done) => {
            const mockPRNode = {} as PullRequestTitlesNode;
            const mockDetailsNode: DescriptionNode = {
                getTreeItem: jest.fn().mockReturnValue({ command: undefined }),
            } as any;

            mockTreeDataProvider.getFirstPullRequestNode.mockResolvedValue(mockPRNode);
            mockTreeDataProvider.getDetailsNode.mockResolvedValue(mockDetailsNode);

            let revealCallCount = 0;
            const spy = jest.spyOn(explorer, 'reveal').mockImplementation(async () => {
                revealCallCount++;
                if (revealCallCount === 2) {
                    // After both reveal calls, check the expectations
                    try {
                        expect(spy).toHaveBeenCalledWith(mockPRNode, { focus: true, expand: true });
                        expect(spy).toHaveBeenCalledWith(mockDetailsNode, { focus: true });
                        done();
                    } catch (error) {
                        done(error);
                    }
                }
            });

            explorer.attemptDetailsNodeExpansionNTimes(3, 100, false);
            jest.advanceTimersByTime(100);
        });

        it('should execute command when openNode is true and command exists', (done) => {
            const mockPRNode = {} as PullRequestTitlesNode;
            const mockCommand = { command: 'test.command', arguments: ['arg1'] };
            const mockDetailsNode: DescriptionNode = {
                getTreeItem: jest.fn().mockReturnValue({ command: mockCommand }),
            } as any;

            mockTreeDataProvider.getFirstPullRequestNode.mockResolvedValue(mockPRNode);
            mockTreeDataProvider.getDetailsNode.mockResolvedValue(mockDetailsNode);
            jest.spyOn(explorer, 'reveal').mockResolvedValue();

            const executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand').mockImplementation(() => {
                // When executeCommand is called, check the expectations
                try {
                    expect(executeCommandSpy).toHaveBeenCalledWith('test.command', 'arg1');
                    done();
                } catch (error) {
                    done(error);
                }
                return Promise.resolve();
            });

            explorer.attemptDetailsNodeExpansionNTimes(3, 100, true);
            jest.advanceTimersByTime(100);
        });
    });

    describe('attemptCreatePRNodeExpansionNTimes', () => {
        beforeEach(() => {
            explorer = new TestBitbucketExplorer(mockContext);
            explorer['treeDataProvider'] = mockTreeDataProvider;
            jest.useFakeTimers();

            // Make the mock data provider pass instanceof check
            Object.setPrototypeOf(mockTreeDataProvider, PullRequestNodeDataProvider.prototype);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should reveal create PR node when remaining attempts is 0', async () => {
            const mockCreatePRNode = {} as CreatePullRequestNode;
            mockTreeDataProvider.getCreatePullRequestNode.mockResolvedValue(mockCreatePRNode);
            const spy = jest.spyOn(explorer, 'reveal').mockResolvedValue();

            await explorer.attemptCreatePRNodeExpansionNTimes(0, 1000, false);

            expect(mockTreeDataProvider.getCreatePullRequestNode).toHaveBeenCalledWith(true);
            expect(spy).toHaveBeenCalledWith(mockCreatePRNode, { focus: true });
        });

        it('should execute create PR command when openNode is true', async () => {
            const mockCreatePRNode = {} as CreatePullRequestNode;
            mockTreeDataProvider.getCreatePullRequestNode.mockResolvedValue(mockCreatePRNode);
            jest.spyOn(explorer, 'reveal').mockResolvedValue();

            const executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

            const promise = explorer.attemptCreatePRNodeExpansionNTimes(3, 1000, true);
            jest.advanceTimersByTime(1000);
            await promise;

            expect(executeCommandSpy).toHaveBeenCalledWith(Commands.CreatePullRequest);
        });
    });

    describe('handleFocusEvent', () => {
        beforeEach(() => {
            explorer = new TestBitbucketExplorer(mockContext);
            jest.spyOn(explorer, 'attemptCreatePRNodeExpansionNTimes').mockResolvedValue();
            jest.spyOn(explorer, 'attemptDetailsNodeExpansionNTimes').mockResolvedValue();
        });

        it('should handle CREATEPULLREQUEST focus event', async () => {
            const event: FocusEvent = {
                action: FocusEventActions.CREATEPULLREQUEST,
            };

            await explorer.handleFocusEvent(event);

            expect(explorer.attemptCreatePRNodeExpansionNTimes).toHaveBeenCalledWith(3, 1000, true);
        });

        it('should handle VIEWPULLREQUEST focus event', async () => {
            const event: FocusEvent = {
                action: FocusEventActions.VIEWPULLREQUEST,
            };

            await explorer.handleFocusEvent(event);

            expect(explorer.attemptDetailsNodeExpansionNTimes).toHaveBeenCalledWith(3, 1000, true);
        });

        it('should not handle other focus events', async () => {
            const event: FocusEvent = {
                action: 'OTHER_ACTION' as any,
            };

            await explorer.handleFocusEvent(event);

            expect(explorer.attemptCreatePRNodeExpansionNTimes).not.toHaveBeenCalled();
            expect(explorer.attemptDetailsNodeExpansionNTimes).not.toHaveBeenCalled();
        });
    });

    describe('updateMonitor', () => {
        beforeEach(() => {
            explorer = new TestBitbucketExplorer(mockContext);
        });

        it('should create monitor when explorer and monitor are enabled', () => {
            (configuration as any).get.mockReturnValue(true);

            explorer.updateMonitor();

            expect(explorer['monitor']).toBeDefined();
        });

        it('should clear monitor when explorer is disabled', () => {
            (configuration as any).get.mockImplementation((key: any) => key !== 'test.explorer.enabled');

            explorer.updateMonitor();

            expect(explorer['monitor']).toBeUndefined();
        });

        it('should clear monitor when monitor is disabled', () => {
            (configuration as any).get.mockImplementation((key: any) => key !== 'test.monitor.enabled');

            explorer.updateMonitor();

            expect(explorer['monitor']).toBeUndefined();
        });
    });

    describe('dispose', () => {
        it('should dispose of all resources', () => {
            explorer = new TestBitbucketExplorer(mockContext);
            const disposableSpy = jest.fn();
            explorer['_disposable'] = { dispose: disposableSpy } as any;
            const superDisposeSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(explorer)), 'dispose');

            explorer.dispose();

            expect(superDisposeSpy).toHaveBeenCalled();
            expect(disposableSpy).toHaveBeenCalled();
        });
    });
});
