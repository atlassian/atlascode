import { isMinimalIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import fs from 'fs';
import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    StatusBarAlignment,
    StatusBarItem,
    TextEditor,
    window,
} from 'vscode';
import { openActiveIssueEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { showIssue } from '../../commands/jira/showIssue';
import { configuration } from '../../config/configuration';
import { JiraEnabledKey } from '../../constants';
import { Container } from '../../container';
import { getCachedIssue } from '../../jira/fetchIssue';
import { issueForKey } from '../../jira/issueForKey';
import { parseJiraIssueKeys } from '../../jira/issueKeyParser';
import { AuthStatusBar } from '../authStatusBar';
import { PRFileDiffQueryParams } from '../pullrequest/diffViewHelper';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { l10n } from 'vscode';

export class JiraActiveIssueStatusBar implements Disposable {
    // show active issue to the right of auth status bar item
    private static StatusBarItemPriority = AuthStatusBar.JiraStausBarItemPriority - 1;
    private static OpenActiveIssueCommand = 'openActiveJiraIssue';
    private disposable: Disposable | undefined;
    private statusBarItem: StatusBarItem | undefined;
    private repoListeners: Disposable | undefined;
    private activeIssue: MinimalIssueOrKeyAndSite<DetailedSiteInfo> | undefined;

    constructor(bbCtx: BitbucketContext) {
        Container.context.subscriptions.push(
            configuration.onDidChange((e) => this.handleConfigurationChange(e)),
            bbCtx.onDidChangeBitbucketContext(() => this.handleRepoChange()),
        );
        void this.handleConfigurationChange(configuration.initializingChangeEvent);
    }

    private handleConfigurationChange(e: ConfigurationChangeEvent) {
        if (
            configuration.initializing(e) ||
            configuration.changed(e, JiraEnabledKey) ||
            configuration.changed(e, 'jira.statusbar')
        ) {
            this.handleActiveIssueChange(undefined);
        }
    }

    private handleRepoChange() {
        this.repoListeners?.dispose();
        this.repoListeners = Disposable.from(
            ...Container.bitbucketContext
                .getAllRepositoriesRaw()
                .map((scm) => scm.state.onDidChange(() => this.handleActiveIssueChange(undefined))),
        );
    }

    private initializeIfNeeded() {
        this.statusBarItem =
            this.statusBarItem ||
            window.createStatusBarItem(StatusBarAlignment.Left, JiraActiveIssueStatusBar.StatusBarItemPriority);
        this.disposable =
            this.disposable ||
            Disposable.from(
                this.statusBarItem,
                window.onDidChangeActiveTextEditor((e) => this.handleActiveIssueChange(e)),
                commands.registerCommand(JiraActiveIssueStatusBar.OpenActiveIssueCommand, () => {
                    if (this.activeIssue) {
                        showIssue(this.activeIssue);
                        openActiveIssueEvent().then((e) => Container.analyticsClient.sendUIEvent(e));
                    }
                }),
            );
    }

    public async handleActiveIssueChange(textOrEditor?: TextEditor | string) {
        if (
            !Container.config.jira.enabled ||
            !Container.config.jira.statusbar.enabled ||
            !Container.config.jira.statusbar.showActiveIssue
        ) {
            this.dispose();
            return;
        }

        this.initializeIfNeeded();

        textOrEditor = textOrEditor || window.activeTextEditor;
        if (textOrEditor === undefined) {
            this.activeIssue ? this.updateStatusBarItem(this.activeIssue) : this.showEmptyStateStatusBarItem();
            return;
        }

        const text = typeof textOrEditor === 'string' ? textOrEditor : this.extractBranchName(textOrEditor);

        const parsedIssueKeys = parseJiraIssueKeys(text);
        if (parsedIssueKeys.length > 0 && parsedIssueKeys[0] !== this.activeIssue?.key) {
            try {
                const issue = (await getCachedIssue(parsedIssueKeys[0])) || (await issueForKey(parsedIssueKeys[0]));
                this.updateStatusBarItem(issue);
            } catch (e) {
                // do nothing
            }
        }
    }

    private extractBranchName(editor: TextEditor): string | undefined {
        if (editor.viewColumn === undefined) {
            return undefined;
        }

        if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
            const { branchName } = JSON.parse(editor.document.uri.query) as PRFileDiffQueryParams;
            return branchName;
        }

        const scm = Container.bitbucketContext?.getAllRepositoriesRaw().find((repo) => {
            try {
                const uriPath = fs.realpathSync(editor.document.uri.fsPath);
                return uriPath.startsWith(repo.rootUri.fsPath);
            } catch (e) {
                return false;
            }
        });
        return scm?.state.HEAD?.name;
    }

    private updateStatusBarItem(issue: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) {
        this.statusBarItem!.text = `$(chevron-right)${issue.key}`;
        this.statusBarItem!.tooltip = `${issue.key} ${isMinimalIssue(issue) ? issue.summary : ''} (active Jira issue)`;
        this.statusBarItem!.command = JiraActiveIssueStatusBar.OpenActiveIssueCommand;
        this.statusBarItem!.show();

        this.activeIssue = issue;
    }

    private showEmptyStateStatusBarItem() {
        this.statusBarItem!.text = `$(chevron-right) No active issue`;
        this.statusBarItem!.tooltip = l10n.t('No active Jira issue - click to view issue explorer');
        this.statusBarItem!.command = 'atlascode.views.jira.customJql.focus';
        this.statusBarItem!.show();
    }

    dispose() {
        this.repoListeners?.dispose();
        this.disposable?.dispose();
        this.statusBarItem = undefined;
        this.disposable = undefined;
    }
}
