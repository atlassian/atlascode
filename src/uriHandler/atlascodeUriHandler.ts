import { CheckoutBranchUriHandlerAction } from './actions/checkoutBranch';
import { CloneRepositoryUriHandlerAction } from './actions/cloneRepository';
import { OpenPullRequestUriHandlerAction } from './actions/openPullRequest';
import { SimpleCallbackAction } from './actions/simpleCallback';
import { ShowJiraIssueUriHandlerAction } from './actions/showJiraIssue';
import { StartWorkUriHandlerAction } from './actions/startWork';
import { UriHandlerAction } from './uriHandlerAction';
import { AnalyticsApi } from '../lib/analyticsApi';
import { CheckoutHelper } from '../bitbucket/interfaces';
import { Uri, UriHandler, window, Disposable } from 'vscode';
import { Logger } from '../logger';
import { JiraIssueFetcher } from './actions/util/jiraIssueFetcher';
import { Container } from '../container';
import * as vscode from 'vscode';

export class AtlascodeUriHandler implements Disposable, UriHandler {
    private disposables: Disposable;

    constructor(private actions: Array<UriHandlerAction>) {
        this.disposables = window.registerUriHandler(this);
    }

    async handleUri(uri: Uri) {
        Logger.debug(`Handling URI (new router): ${uri.toString()}`);

        // TODO: keeping the exact logic of the original code for now,
        //       since changing this would need a lot of manual E2E testing.
        //       We could probably simplify this to a route map?
        const action = this.actions.find((h) => h.isAccepted(uri));
        if (!action) {
            Logger.debug(`Unsupported URI path: ${uri.path}`);
            window.showErrorMessage(vscode.l10n.t(`Handler not found for URI: {0}`, uri.toString()));
            return;
        }

        try {
            await action.handle(uri);
        } catch (e) {
            Logger.debug('Error handling URI:', e);
            window.showErrorMessage(vscode.l10n.t('Error handling URI: {0}. Check log for details', uri.toString()));
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }

    static create(
        analyticsApi: AnalyticsApi,
        bitbucketHelper: CheckoutHelper,
        jiraIssueFetcher: JiraIssueFetcher = new JiraIssueFetcher(),
    ) {
        return new AtlascodeUriHandler([
            new SimpleCallbackAction('openSettings', () => Container.settingsWebviewFactory.createOrShow()),
            new SimpleCallbackAction('openOnboarding', () => Container.onboardingWebviewFactory.createOrShow()),
            new CheckoutBranchUriHandlerAction(bitbucketHelper, analyticsApi),
            new OpenPullRequestUriHandlerAction(analyticsApi, bitbucketHelper),
            new CloneRepositoryUriHandlerAction(bitbucketHelper, analyticsApi),
            new StartWorkUriHandlerAction(analyticsApi, jiraIssueFetcher),
            new ShowJiraIssueUriHandlerAction(analyticsApi, jiraIssueFetcher),
        ]);
    }
}
