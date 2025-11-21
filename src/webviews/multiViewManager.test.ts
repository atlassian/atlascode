import { Disposable, Event, EventEmitter } from 'vscode';

import { AbstractMultiViewManager } from './multiViewManager';

// Mock the abstractWebview module
jest.mock('./abstractWebview', () => ({
    isInitializable: (object: any): boolean => {
        return object?.initialize !== undefined;
    },
}));

interface ReactWebview {
    hide(): void;
    createOrShow(): Promise<void>;
    onDidPanelDispose(): Event<void>;
    invalidate(): void;
    handleContextMenuCommand?({ action, data }: { action: string; data: Record<string, string | boolean> }): void;
    dispose(): void;
}

class MockReactWebview implements ReactWebview {
    private _onDidPanelDispose = new EventEmitter<void>();
    public createOrShowCalled = false;
    public invalidateCalled = false;
    public disposeCalled = false;
    public initializeCalled = false;
    public initializeData: any = undefined;
    public handleContextMenuCommandCalled = false;
    public contextMenuCommandData: any = undefined;

    hide(): void {}

    async createOrShow(): Promise<void> {
        this.createOrShowCalled = true;
    }

    onDidPanelDispose(): Event<void> {
        return this._onDidPanelDispose.event;
    }

    invalidate(): void {
        this.invalidateCalled = true;
    }

    handleContextMenuCommand({ action, data }: { action: string; data: Record<string, string | boolean> }): void {
        this.handleContextMenuCommandCalled = true;
        this.contextMenuCommandData = { action, data };
    }

    dispose(): void {
        this.disposeCalled = true;
    }

    simulateDispose(): void {
        this._onDidPanelDispose.fire();
    }

    initialize(data: any): void {
        this.initializeCalled = true;
        this.initializeData = data;
    }
}

// Test data interface
interface TestData {
    id: string;
    value: string;
}

class TestMultiViewManager extends AbstractMultiViewManager<TestData> {
    public createViewCalled = false;
    public lastCreatedView: MockReactWebview | undefined;

    dataKey(data: TestData): string {
        return data.id;
    }

    createView(extensionPath: string): ReactWebview {
        this.createViewCalled = true;
        const view = new MockReactWebview();
        this.lastCreatedView = view;
        return view;
    }

    getViewMap(): Map<string, ReactWebview> {
        return (this as any)._viewMap;
    }

    getListeners(): Map<string, Disposable> {
        return (this as any)._listeners;
    }
}

describe('AbstractMultiViewManager', () => {
    let manager: TestMultiViewManager;
    const extensionPath = '/test/extension/path';

    beforeEach(() => {
        manager = new TestMultiViewManager(extensionPath);
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('constructor', () => {
        it('should initialize with empty view map', () => {
            expect(manager.getViewMap().size).toBe(0);
        });

        it('should initialize with empty listeners map', () => {
            expect(manager.getListeners().size).toBe(0);
        });
    });

    describe('createOrShow', () => {
        it('should create a new view when none exists', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);

            expect(manager.createViewCalled).toBe(true);
            expect(manager.getViewMap().size).toBe(1);
            expect(manager.getViewMap().has('test-1')).toBe(true);
        });

        it('should call createOrShow on the view', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);

            const view = manager.getViewMap().get('test-1') as MockReactWebview;
            expect(view.createOrShowCalled).toBe(true);
        });

        it('should initialize the view if it implements InitializingWebview', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);

            const view = manager.getViewMap().get('test-1') as MockReactWebview;
            expect(view.initializeCalled).toBe(true);
            expect(view.initializeData).toEqual(testData);
        });

        it('should reuse existing view for the same data key', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);
            const firstView = manager.lastCreatedView;

            await manager.createOrShow(testData);
            const secondView = manager.lastCreatedView;

            expect(manager.getViewMap().size).toBe(1);
            expect(firstView).toBe(secondView);
        });

        it('should create separate views for different data keys', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Test Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Test Value 2' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);

            expect(manager.getViewMap().size).toBe(2);
            expect(manager.getViewMap().has('test-1')).toBe(true);
            expect(manager.getViewMap().has('test-2')).toBe(true);
        });

        it('should register a dispose listener for each view', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);

            expect(manager.getListeners().size).toBe(1);
            expect(manager.getListeners().has('test-1')).toBe(true);
        });

        it('should handle view disposal and clean up resources', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);
            const view = manager.getViewMap().get('test-1') as MockReactWebview;

            view.simulateDispose();

            expect(manager.getViewMap().has('test-1')).toBe(false);
            expect(manager.getListeners().has('test-1')).toBe(false);
            expect(view.disposeCalled).toBe(true);
        });

        it('should handle multiple views with independent disposal', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Test Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Test Value 2' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);

            const view1 = manager.getViewMap().get('test-1') as MockReactWebview;
            const view2 = manager.getViewMap().get('test-2') as MockReactWebview;

            view1.simulateDispose();

            expect(manager.getViewMap().has('test-1')).toBe(false);
            expect(manager.getViewMap().has('test-2')).toBe(true);
            expect(view1.disposeCalled).toBe(true);
            expect(view2.disposeCalled).toBe(false);
        });
    });

    describe('handleContextMenu', () => {
        it('should handle context menu command for existing view', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };
            await manager.createOrShow(testData);

            const result = manager.handleContextMenu({
                viewKey: 'test-1',
                action: 'testAction',
                data: { key: 'value', flag: true },
            });

            const view = manager.getViewMap().get('test-1') as MockReactWebview;
            expect(result).toBe(true);
            expect(view.handleContextMenuCommandCalled).toBe(true);
            expect(view.contextMenuCommandData).toEqual({
                action: 'testAction',
                data: { key: 'value', flag: true },
            });
        });

        it('should return false for non-existent view', () => {
            const result = manager.handleContextMenu({
                viewKey: 'non-existent',
                action: 'testAction',
                data: { key: 'value' },
            });

            expect(result).toBe(false);
        });

        it('should return false if view does not implement handleContextMenuCommand', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };
            await manager.createOrShow(testData);

            const view = manager.getViewMap().get('test-1') as any;
            view.handleContextMenuCommand = undefined;

            const result = manager.handleContextMenu({
                viewKey: 'test-1',
                action: 'testAction',
                data: { key: 'value' },
            });

            expect(result).toBe(false);
        });

        it('should return false if handleContextMenuCommand is not a function', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };
            await manager.createOrShow(testData);

            const view = manager.getViewMap().get('test-1') as any;
            view.handleContextMenuCommand = 'not a function';

            const result = manager.handleContextMenu({
                viewKey: 'test-1',
                action: 'testAction',
                data: { key: 'value' },
            });

            expect(result).toBe(false);
        });
    });

    describe('refreshAll', () => {
        it('should call invalidate on all views', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Test Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Test Value 2' };
            const testData3: TestData = { id: 'test-3', value: 'Test Value 3' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);
            await manager.createOrShow(testData3);

            manager.refreshAll();

            const view1 = manager.getViewMap().get('test-1') as MockReactWebview;
            const view2 = manager.getViewMap().get('test-2') as MockReactWebview;
            const view3 = manager.getViewMap().get('test-3') as MockReactWebview;

            expect(view1.invalidateCalled).toBe(true);
            expect(view2.invalidateCalled).toBe(true);
            expect(view3.invalidateCalled).toBe(true);
        });

        it('should handle empty view map', () => {
            expect(() => manager.refreshAll()).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should dispose all views', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Test Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Test Value 2' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);

            const view1 = manager.getViewMap().get('test-1') as MockReactWebview;
            const view2 = manager.getViewMap().get('test-2') as MockReactWebview;

            manager.dispose();

            expect(view1.disposeCalled).toBe(true);
            expect(view2.disposeCalled).toBe(true);
        });

        it('should clear the view map', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Test Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Test Value 2' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);

            manager.dispose();

            expect(manager.getViewMap().size).toBe(0);
        });

        it('should handle disposing when view map is empty', () => {
            expect(() => manager.dispose()).not.toThrow();
        });

        it('should be idempotent', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };
            await manager.createOrShow(testData);

            manager.dispose();
            expect(() => manager.dispose()).not.toThrow();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex lifecycle with multiple views', async () => {
            const testData1: TestData = { id: 'test-1', value: 'Value 1' };
            const testData2: TestData = { id: 'test-2', value: 'Value 2' };
            const testData3: TestData = { id: 'test-3', value: 'Value 3' };

            await manager.createOrShow(testData1);
            await manager.createOrShow(testData2);
            await manager.createOrShow(testData3);

            expect(manager.getViewMap().size).toBe(3);

            manager.refreshAll();

            const view2 = manager.getViewMap().get('test-2') as MockReactWebview;
            view2.simulateDispose();

            expect(manager.getViewMap().size).toBe(2);
            expect(manager.getViewMap().has('test-2')).toBe(false);

            const result = manager.handleContextMenu({
                viewKey: 'test-1',
                action: 'test',
                data: {},
            });

            expect(result).toBe(true);

            manager.dispose();
            expect(manager.getViewMap().size).toBe(0);
        });

        it('should allow recreating a view after disposal', async () => {
            const testData: TestData = { id: 'test-1', value: 'Test Value' };

            await manager.createOrShow(testData);
            const firstView = manager.getViewMap().get('test-1') as MockReactWebview;

            firstView.simulateDispose();
            expect(manager.getViewMap().has('test-1')).toBe(false);

            await manager.createOrShow(testData);
            const secondView = manager.getViewMap().get('test-1') as MockReactWebview;

            expect(manager.getViewMap().has('test-1')).toBe(true);
            expect(secondView).not.toBe(firstView);
            expect(secondView.initializeCalled).toBe(true);
        });
    });
});
