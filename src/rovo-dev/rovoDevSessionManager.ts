import { Logger } from 'src/logger';
import {
    Event,
    EventEmitter,
    QuickInputButton,
    QuickPick,
    QuickPickItem,
    QuickPickItemKind,
    ThemeIcon,
    window,
} from 'vscode';

import { RovoDevApiClient } from './client';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

interface QuickPickSessionItem extends QuickPickItem {
    id: string;
    lastSaved: number; // from Date.parse
}

const ForkButton: QuickInputButton = {
    iconPath: new ThemeIcon('repo-forked'),
    tooltip: 'Fork session',
};

const DeleteButton: QuickInputButton = {
    iconPath: new ThemeIcon('trash'),
    tooltip: 'Delete session',
};

const CurrentSessionSeparator: QuickPickSessionItem = {
    id: 'separator',
    label: 'Current session',
    kind: QuickPickItemKind.Separator,
    lastSaved: 0,
};

const PastSessionsSeparator: QuickPickSessionItem = {
    id: 'separator',
    label: 'Past sessions',
    kind: QuickPickItemKind.Separator,
    lastSaved: 0,
};

const formatDuration = (milliseconds: number): string => {
    const seconds = milliseconds / 1000;

    const periods: [number, string, string][] = [
        [60 * 60 * 24 * 365, 'a year', '{0} years'],
        [60 * 60 * 24 * 30, 'a month', '{0} months'],
        [60 * 60 * 24 * 7, 'a week', '{0} weeks'],
        [60 * 60 * 24, 'a day', '{0} days'],
        [60 * 60, 'an hour', '{0} hours'],
        [60, 'a minute', '{0} minutes'],
    ];

    for (const period of periods) {
        const span = Math.floor(seconds / period[0]);
        if (span > 0) {
            return span === 1 ? period[1] : period[2].replace('{0}', `${span}`);
        }
    }

    return 'less than a minute';
};

function formatItemDescription(created: number): string {
    return `- Last used ${formatDuration(Date.now() - created)} ago`;
}

/** Implements a Session manager via quick picker.
 *
 * Note: This class instance is good for a single `showPicker()` invocation only.
 * This instance will automatically dispose when the picker closes.
 */
export class RovoDevSessionManager {
    private quickPicker: QuickPick<QuickPickSessionItem> | undefined;
    private busy = false;
    private disposed = false;

    private _onSessionRestored = new EventEmitter<string>();
    public get onSessionRestored(): Event<string> {
        return this._onSessionRestored.event;
    }

    constructor(
        private readonly _workspaceFolder: string,
        private readonly _rovoDevApiClient: RovoDevApiClient,
        private readonly _telemetryProvider: RovoDevTelemetryProvider,
    ) {}

    /** Shows the VS Code quick picker to manage the existing sessions.
     *
     * Note: This class instance will automatically dispose when the picker closes!
     */
    public async showPicker() {
        this.quickPicker?.dispose();
        this.quickPicker = undefined;

        const quickPickItems = await this.getItems();
        if (quickPickItems.length === 0) {
            window.showInformationMessage('There are no previous sessions to restore');
            return;
        }

        const quickPick = window.createQuickPick<QuickPickSessionItem>();
        quickPick.title = 'Restore a previous session';
        quickPick.placeholder = 'Select a session to restore';
        quickPick.matchOnDetail = true;
        quickPick.items = quickPickItems;

        // click on the item itself
        quickPick.onDidAccept(async () => {
            if (!this.busy && !this.disposed) {
                try {
                    this.busy = true;
                    const selected = quickPick.selectedItems[0];
                    if (selected) {
                        await this.restoreSession(selected.id, selected.label);
                    }
                    quickPick.hide();
                } finally {
                    this.busy = false;
                }
            }
        });

        // click on any of the item's buttons
        quickPick.onDidTriggerItemButton(async (e) => {
            if (!this.busy && !this.disposed) {
                try {
                    this.busy = true;
                    if (e.button === ForkButton) {
                        await this.forkSession(e.item.id, e.item.label);
                        quickPick.hide();
                    } else if (e.button === DeleteButton) {
                        if (await this.deleteSession(e.item.id, e.item.label)) {
                            // deletes the item in place keeping the drawer open, unless there are no more items
                            quickPick.items = quickPick.items.filter((x) => x !== e.item);
                            if (quickPick.items.length === 0) {
                                quickPick.hide();
                            }
                        }
                    } else {
                        quickPick.hide();
                    }
                } finally {
                    this.busy = false;
                }
            }
        });

        // on quickpick close, we dispose everything
        quickPick.onDidHide(() => this.dispose());

        this.quickPicker = quickPick;
        this.quickPicker.show();

        this._telemetryProvider.fireScreenTelemetryEvent('rovoDevSessionHistoryPicker');
    }

    private async restoreSession(sessionId: string, label: string) {
        let success: boolean;
        try {
            await this._rovoDevApiClient.restoreSession(sessionId);
            window.showInformationMessage(`Session "${label}" restored successfully.`);
            success = true;
        } catch (error) {
            window.showErrorMessage(`Failed to restore session "${label}": ${error}`);
            Logger.error(error, 'Failed to restore a session');
            success = false;
        }

        try {
            this._telemetryProvider.fireTelemetryEvent({
                action: 'clicked',
                subject: 'rovoDevRestoreSession',
                attributes: {
                    failed: !success,
                },
            });
        } catch {}

        if (success) {
            try {
                this._onSessionRestored.fire(sessionId);
            } catch {}
        }

        return success;
    }

    private async forkSession(sessionId: string, label: string) {
        let success: boolean;
        let newSessionId: string;
        try {
            newSessionId = await this._rovoDevApiClient.forkSession(sessionId);
            window.showInformationMessage(`Session "${label}" forked successfully.`);
            success = true;
        } catch (error) {
            newSessionId = '';
            window.showErrorMessage(`Failed to fork session "${label}": ${error}`);
            Logger.error(error, 'Failed to fork a session');
            success = false;
        }

        try {
            this._telemetryProvider.fireTelemetryEvent({
                action: 'clicked',
                subject: 'rovoDevForkSession',
                attributes: {
                    failed: !success,
                },
            });
        } catch {}

        if (success) {
            try {
                // this should not be necessary, but Rovo Dev seems not to restore the message history
                // on fork, and we want to replay them
                await this._rovoDevApiClient.restoreSession(newSessionId);

                // we fire a session restored here because effectively the new forked session has been restored.
                // the user may have forked from a different session than the previous loaded one, so we need to start a replay.
                this._onSessionRestored.fire(newSessionId);
            } catch {}
        }

        return success;
    }

    private async deleteSession(sessionId: string, label: string) {
        let success: boolean;
        let currentSessionId: string;
        try {
            currentSessionId = (await this._rovoDevApiClient.getCurrentSession()).id;
            await this._rovoDevApiClient.deleteSession(sessionId);
            window.showInformationMessage(`Session "${label}" deleted successfully.`);
            success = true;
        } catch (error) {
            currentSessionId = '';
            window.showErrorMessage(`Failed to delete session "${label}": ${error}`);
            Logger.error(error, 'Failed to delete a session');
            success = false;
        }

        try {
            this._telemetryProvider.fireTelemetryEvent({
                action: 'clicked',
                subject: 'rovoDevDeleteSession',
                attributes: {
                    failed: !success,
                },
            });
        } catch {}

        if (success) {
            try {
                // if the current session gets deleted, a new one is created.
                // in this case, we need to clear the chat
                if (sessionId === currentSessionId) {
                    const newSessionId = (await this._rovoDevApiClient.getCurrentSession()).id;
                    this._onSessionRestored.fire(newSessionId);
                }
            } catch {}
        }

        return success;
    }

    private async getItems(): Promise<QuickPickSessionItem[]> {
        const sessions = await this._rovoDevApiClient.listSessions();
        const currentSessionId = (await this._rovoDevApiClient.getCurrentSession()).id;

        const activeIcon = new ThemeIcon('vm-active');
        const outlineIcon = new ThemeIcon('vm-outline');

        const items = sessions
            // filter out empty sessions, and sessions for other repositories
            .filter((x) => x.num_messages > 0 && x.workspace_path === this._workspaceFolder)
            .map<QuickPickSessionItem>((x) => {
                const lastSaved = Date.parse(x.last_saved);
                return {
                    id: x.id,
                    iconPath: x.id === currentSessionId ? activeIcon : outlineIcon,
                    label: x.title,
                    description: formatItemDescription(lastSaved),
                    detail: x.initial_prompt,
                    buttons: [ForkButton, DeleteButton],
                    lastSaved,
                    picked: x.id === currentSessionId,
                };
            });

        if (items.length > 0) {
            // sorts them from the most recent to the oldest, and bumps the current session on top
            items.sort((a, b) => (a.picked ? -1 : b.picked ? 1 : b.lastSaved - a.lastSaved));

            // it's possible that the current session doesn't appear in the list if it's empty
            if (items[0].picked) {
                items.splice(1, 0, PastSessionsSeparator);
                items.splice(0, 0, CurrentSessionSeparator);
            } else {
                items.splice(0, 0, PastSessionsSeparator);
            }
        }

        return items;
    }

    private dispose() {
        this.disposed = true;

        this._onSessionRestored.dispose();

        this.quickPicker?.dispose();
        this.quickPicker = undefined;
    }
}
