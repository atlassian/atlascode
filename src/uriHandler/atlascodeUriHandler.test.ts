class BasicUriHandlerMock {
    constructor(
        protected readonly suffix: string,
        protected readonly handler?: () => Promise<void>,
    ) {}

    public isAccepted(uri: Uri): boolean {
        return uri.path.includes(this.suffix);
    }

    public async handle(uri: Uri): Promise<void> {
        if (this.handler) {
            await this.handler();
        }
        return Promise.resolve();
    }

    public getSource(uri: Uri): string {
        return 'source';
    }

    public getTarget(uri: Uri): string {
        return 'target';
    }
}

class CloneRepositoryUriHandlerActionMock extends BasicUriHandlerMock {
    public static overrideHandler: ((uri: Uri) => Promise<void>) | undefined;

    constructor() {
        super('clone');
    }

    override handle(uri: Uri): Promise<void> {
        return CloneRepositoryUriHandlerActionMock.overrideHandler
            ? CloneRepositoryUriHandlerActionMock.overrideHandler(uri)
            : super.handle(uri);
    }
}

class OpenPullRequestUriHandlerActionMock extends BasicUriHandlerMock {
    public static overrideHandler: ((uri: Uri) => Promise<void>) | undefined;

    constructor() {
        super('openPr');
    }

    override handle(uri: Uri): Promise<void> {
        return CloneRepositoryUriHandlerActionMock.overrideHandler
            ? CloneRepositoryUriHandlerActionMock.overrideHandler(uri)
            : super.handle(uri);
    }
}

class UriHandlerNotFoundHandlerMock extends BasicUriHandlerMock {
    constructor() {
        super('');
    }

    public override isAccepted(uri: Uri): boolean {
        // This handler accepts everything (fallback)
        return true;
    }
}

jest.mock('./actions/basicUriHandler', () => ({
    BasicUriHandler: BasicUriHandlerMock,
}));
jest.mock('./actions/cloneRepository', () => ({
    CloneRepositoryUriHandler: CloneRepositoryUriHandlerActionMock,
}));
jest.mock('./actions/openPullRequest', () => ({
    OpenPullRequestUriHandler: OpenPullRequestUriHandlerActionMock,
}));
jest.mock('./actions/openOrWorkOnJiraIssue', () => ({
    OpenOrWorkOnJiraIssueUriHandler: BasicUriHandlerMock,
}));
jest.mock('./actions/uriHandlerNotFoundHandler', () => ({
    UriHandlerNotFoundHandler: UriHandlerNotFoundHandlerMock,
}));

import * as vscode from 'vscode';
import { Uri, window } from 'vscode';

import { expansionCastTo } from '../../testsutil';
import { CheckoutHelper } from '../bitbucket/interfaces';
import { Container } from '../container';
import { AnalyticsApi } from '../lib/analyticsApi';
import { AtlascodeUriHandler } from './atlascodeUriHandler';

// Mock Container
jest.mock('../container', () => ({
    Container: {
        settingsWebviewFactory: {
            createOrShow: jest.fn(() => Promise.resolve()),
        },
        focus: jest.fn(() => Promise.resolve()),
    },
}));

describe('AtlascodeUriHandler', () => {
    const analyticsApi = { fireDeepLinkEvent: jest.fn(() => Promise.resolve()) };
    let handler: AtlascodeUriHandler;

    beforeEach(() => {
        // Reset singleton for each test
        (AtlascodeUriHandler as any).singleton = undefined;

        // Set up default mocks for Disposable.from
        const mockDisposable = { dispose: jest.fn() };
        (vscode.Disposable as any).from = jest.fn().mockReturnValue(mockDisposable);
        (window.registerUriHandler as jest.Mock).mockReturnValue(mockDisposable);

        handler = AtlascodeUriHandler.create(
            expansionCastTo<AnalyticsApi>(analyticsApi),
            expansionCastTo<CheckoutHelper>({}),
        );
    });

    afterEach(() => {
        CloneRepositoryUriHandlerActionMock.overrideHandler = undefined;
        OpenPullRequestUriHandlerActionMock.overrideHandler = undefined;
        (AtlascodeUriHandler as any).singleton = undefined;

        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should return singleton instance', () => {
            const instance1 = AtlascodeUriHandler.create(
                expansionCastTo<AnalyticsApi>(analyticsApi),
                expansionCastTo<CheckoutHelper>({}),
            );
            const instance2 = AtlascodeUriHandler.create(
                expansionCastTo<AnalyticsApi>(analyticsApi),
                expansionCastTo<CheckoutHelper>({}),
            );

            expect(instance1).toBe(instance2);
        });

        it('should create instance with proper actions', () => {
            const instance = AtlascodeUriHandler.create(
                expansionCastTo<AnalyticsApi>(analyticsApi),
                expansionCastTo<CheckoutHelper>({}),
            );

            expect(instance).toBeInstanceOf(AtlascodeUriHandler);
        });

        it('should register URI handler with VSCode window and create disposables', () => {
            // Clear any existing mocks
            jest.clearAllMocks();

            // Mock window.registerUriHandler to return a disposable
            const mockUriHandlerDisposable = { dispose: jest.fn() };
            (window.registerUriHandler as jest.Mock).mockReturnValue(mockUriHandlerDisposable);

            // Mock Disposable.from to track when it's called
            const mockCompositeDisposable = { dispose: jest.fn() };
            const mockDisposableFrom = jest.fn().mockReturnValue(mockCompositeDisposable);
            (vscode.Disposable as any).from = mockDisposableFrom;

            // Reset singleton to ensure fresh instance creation
            (AtlascodeUriHandler as any).singleton = undefined;

            // Create instance - this should trigger the constructor and the Disposable.from call
            const instance = AtlascodeUriHandler.create(
                expansionCastTo<AnalyticsApi>(analyticsApi),
                expansionCastTo<CheckoutHelper>({}),
            );

            // Verify the URI handler was registered
            expect(window.registerUriHandler).toHaveBeenCalledWith(instance);

            // Verify Disposable.from was called with the result of registerUriHandler
            expect(mockDisposableFrom).toHaveBeenCalledWith(mockUriHandlerDisposable);

            // Verify the instance was created
            expect(instance).toBeInstanceOf(AtlascodeUriHandler);
        });
    });

    describe('dispose', () => {
        it('should dispose of disposables', () => {
            const disposeSpy = jest.fn();

            // Mock the disposables property
            (handler as any).disposables = { dispose: disposeSpy };

            handler.dispose();

            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('action handlers', () => {
        it('should execute openSettings action', async () => {
            // Test that the openSettings action function is called
            const openSettingsUri = Uri.parse('vscode://atlassian.atlascode/openSettings');

            // Mock the action to verify it gets called
            jest.spyOn(window, 'showErrorMessage');

            await handler.handleUri(openSettingsUri);

            // Should not show error message if action is found and executed
            expect(window.showErrorMessage).not.toHaveBeenCalled();
            expect(Container.settingsWebviewFactory.createOrShow).toHaveBeenCalled();
        });

        it('should execute extension action', async () => {
            // Test that the extension action function is called
            const extensionUri = Uri.parse('vscode://atlassian.atlascode/extension');

            jest.spyOn(window, 'showErrorMessage');

            await handler.handleUri(extensionUri);

            expect(window.showErrorMessage).not.toHaveBeenCalled();
            expect(Container.focus).toHaveBeenCalled();
        });
    });

    describe('handleUri', () => {
        it('shows error if the right action is not found', async () => {
            jest.spyOn(window, 'showErrorMessage');
            jest.spyOn(analyticsApi, 'fireDeepLinkEvent');

            await handler.handleUri(Uri.parse('vscode:some-uri'));
            expect(window.showErrorMessage).toHaveBeenCalled();
            expect(analyticsApi.fireDeepLinkEvent).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'NotFound',
            );
        });

        it('shows error if action is found, but throws', async () => {
            CloneRepositoryUriHandlerActionMock.overrideHandler = () => Promise.reject('error');

            jest.spyOn(window, 'showErrorMessage');
            jest.spyOn(analyticsApi, 'fireDeepLinkEvent');

            await handler.handleUri(Uri.parse('vscode:clone'));
            expect(window.showErrorMessage).toHaveBeenCalled();
            expect(analyticsApi.fireDeepLinkEvent).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'Exception',
            );
        });

        it('executes the action if found', async () => {
            jest.spyOn(window, 'showErrorMessage');
            jest.spyOn(analyticsApi, 'fireDeepLinkEvent');

            await handler.handleUri(Uri.parse('vscode:clone'));
            expect(window.showErrorMessage).not.toHaveBeenCalled();
            expect(analyticsApi.fireDeepLinkEvent).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'Success',
            );
        });
    });
});
