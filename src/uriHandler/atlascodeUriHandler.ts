import { Disposable, env, Uri, UriHandler, window } from 'vscode';

import { CheckoutHelper } from '../bitbucket/interfaces';
import { ExtensionId } from '../constants';
import { Container } from '../container';
import { AnalyticsApi } from '../lib/analyticsApi';
import { Logger } from '../logger';
import { BasicUriHandler } from './actions/basicUriHandler';
import { CloneRepositoryUriHandler } from './actions/cloneRepository';
import { OpenOrWorkOnJiraIssueUriHandler } from './actions/openOrWorkOnJiraIssue';
import { OpenPullRequestUriHandler } from './actions/openPullRequest';
import { UriHandlerNotFoundHandler } from './actions/uriHandlerNotFoundHandler';

export const SETTINGS_URL = `${env.uriScheme || 'vscode'}://${ExtensionId}/openSettings`;
export const ONBOARDING_URL = `${env.uriScheme || 'vscode'}://${ExtensionId}/openOnboarding`;

export class AtlascodeUriHandler extends Disposable implements UriHandler {
    private static singleton: AtlascodeUriHandler;

    static create(analyticsApi: AnalyticsApi, bitbucketHelper: CheckoutHelper): AtlascodeUriHandler {
        if (!this.singleton) {
            this.singleton = new AtlascodeUriHandler(analyticsApi, [
                new BasicUriHandler('openSettings', () => Container.settingsWebviewFactory.createOrShow()),
                new BasicUriHandler('openOnboarding', () => Container.onboardingWebviewFactory.createOrShow()),
                new OpenPullRequestUriHandler(bitbucketHelper),
                new CloneRepositoryUriHandler(bitbucketHelper),
                new OpenOrWorkOnJiraIssueUriHandler('openJiraIssue'),
                new OpenOrWorkOnJiraIssueUriHandler('startWorkOnJira'),
                new UriHandlerNotFoundHandler(), // this one must be the last one, because it always matches
            ]);
        }

        return this.singleton;
    }

    private readonly disposables: Disposable;

    private constructor(
        private analyticsApi: AnalyticsApi,
        private actions: Array<BasicUriHandler>,
    ) {
        super(() => this.dispose());

        this.disposables = Disposable.from(window.registerUriHandler(this));
    }

    async handleUri(uri: Uri): Promise<void> {
        Logger.debug(`Handling URI: ${uri.toString()}`);

        // it's certain we have an action because last one (HandlerNotFoundHandler) matches anything
        const action = this.actions.find((h) => h.isAccepted(uri))!;

        const source = action.getSource(uri);
        const target = action.getTarget(uri);

        if (action instanceof UriHandlerNotFoundHandler) {
            this.analyticsApi.fireDeepLinkEvent(source, target, 'NotFound');
            Logger.debug(`Unsupported URI path: ${uri.path}`);
            window.showErrorMessage(`Handler not found for URI: ${uri.toString()}`);
        } else {
            try {
                await action.handle(uri);
                this.analyticsApi.fireDeepLinkEvent(source, target, 'Success');
            } catch (e) {
                this.analyticsApi.fireDeepLinkEvent(source, target, 'Exception');
                Logger.debug('Error handling URI:', e);
                window.showErrorMessage(`Error handling URI: ${uri.toString()}. Check log for details`);
            }
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }
}
