import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { CancellationToken, EventEmitter, FileDecorationProvider, ThemeColor, TreeView, Uri, window } from 'vscode';

import { getJiraIssueUri } from './utils';

export class JiraBadgeManager implements FileDecorationProvider {
    private static jiraIssueDecorationProviderSingleton: JiraBadgeManager | undefined = undefined;

    public static initialize<T>(treeViewParent: TreeView<T>): JiraBadgeManager {
        this.jiraIssueDecorationProviderSingleton = new JiraBadgeManager(treeViewParent);
        return this.jiraIssueDecorationProviderSingleton;
    }

    public static getInstance(): JiraBadgeManager {
        return this.jiraIssueDecorationProviderSingleton!;
    }

    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();
    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    private badgesRegistration: Record<string, number> = {};
    private overallCount = 0;

    private constructor(private treeViewParent: TreeView<any>) {
        if (JiraBadgeManager.jiraIssueDecorationProviderSingleton) {
            throw new Error('An instance of JiraBadgeManager already exists.');
        }

        window.registerFileDecorationProvider(this);
    }

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const badgeValue = this.badgesRegistration[this.getUriString(uri)];
        if (!badgeValue) {
            return undefined;
        }

        return {
            badge: this.getBadgeValue(badgeValue),
            tooltip: `${badgeValue} notifications`,
            color: new ThemeColor('editorForeground'),
            propagate: false,
        };
    }

    public notificationSentForIssue(issue: MinimalIssue<DetailedSiteInfo>): void {
        this.notificationSent(getJiraIssueUri(issue));
    }

    public notificationSent(uri: Uri): void {
        this.increaseBadgeCount(uri);
        this._onDidChangeFileDecorations.fire(uri);
    }

    private increaseBadgeCount(uri: Uri, increment?: number): void {
        increment = increment || 1;

        const stringUri = this.getUriString(uri);
        const existingBadge = this.badgesRegistration[stringUri] || 0;
        this.badgesRegistration[stringUri] = existingBadge + increment;

        this._onDidChangeFileDecorations.fire(uri);

        this.overallCount += increment;
        this.treeViewParent.badge = {
            value: this.overallCount,
            tooltip: 'xxx',
        };
    }

    public clearBadgeForIssue(issue: MinimalIssue<DetailedSiteInfo>): void {
        this.clearBadgeForUri(getJiraIssueUri(issue));
    }

    public clearBadgeForUri(uri: Uri): void {
        const stringUri = this.getUriString(uri);
        const existingBadge = this.badgesRegistration[stringUri] || 0;
        delete this.badgesRegistration[stringUri];

        this._onDidChangeFileDecorations.fire(uri);

        this.overallCount -= existingBadge;

        if (!this.overallCount) {
            this.treeViewParent.badge = undefined;
        } else {
            this.treeViewParent.badge = {
                value: this.overallCount,
                tooltip: 'xxx',
            };
        }
    }

    private getUriString(uri: Uri): string {
        return uri.toString();
    }

    private getBadgeValue(value: number): string {
        switch (value) {
            case 1:
                return '1️⃣';
            case 2:
                return '2️⃣';
            case 3:
                return '3️⃣';
            case 4:
                return '4️⃣';
            case 5:
                return '5️⃣';
            case 6:
                return '6️⃣';
            case 7:
                return '7️⃣';
            case 8:
                return '8️⃣';
            case 9:
                return '9️⃣';
            case 10:
                return '🔟';
            case 100:
                return '💯';
            default:
                return '🔟+';
        }
    }
}
