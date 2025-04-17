class BasicUriHandlerMock {
    constructor(protected readonly suffix: string) {}

    public isAccepted(uri: Uri): boolean {
        return uri.path.endsWith(this.suffix);
    }

    public handle(uri: Uri): Promise<void> {
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

jest.mock('./actions/basicUriHandler', () => ({
    BasicUriHandler: BasicUriHandlerMock,
}));
jest.mock('./actions/cloneRepository', () => ({
    CloneRepositoryUriHandler: CloneRepositoryUriHandlerActionMock,
}));
jest.mock('./actions/openPullRequest', () => ({
    OpenPullRequestUriHandler: OpenPullRequestUriHandlerActionMock,
}));

import { Uri, window } from 'vscode';

import { expansionCastTo } from '../../testsutil';
import { CheckoutHelper } from '../bitbucket/interfaces';
import { AnalyticsApi } from '../lib/analyticsApi';
import { AtlascodeUriHandler } from './atlascodeUriHandler';

describe('AtlascodeUriHandler', () => {
    const analyticsApi = { fireDeepLinkEvent: () => Promise.resolve() };

    const singleton = AtlascodeUriHandler.create(
        expansionCastTo<AnalyticsApi>(analyticsApi),
        expansionCastTo<CheckoutHelper>({}),
    );

    afterEach(() => {
        CloneRepositoryUriHandlerActionMock.overrideHandler = undefined;
        OpenPullRequestUriHandlerActionMock.overrideHandler = undefined;

        jest.clearAllMocks();
    });

    describe('handleUri', () => {
        it('shows error if the right action is not found', async () => {
            jest.spyOn(window, 'showErrorMessage');
            jest.spyOn(analyticsApi, 'fireDeepLinkEvent');

            await singleton.handleUri(Uri.parse('vscode:some-uri'));
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

            await singleton.handleUri(Uri.parse('vscode:clone'));
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

            await singleton.handleUri(Uri.parse('vscode:clone'));
            expect(window.showErrorMessage).not.toHaveBeenCalled();
            expect(analyticsApi.fireDeepLinkEvent).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'Success',
            );
        });
    });
});
