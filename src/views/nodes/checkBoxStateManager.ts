import { Logger } from 'src/logger';
import vscode from 'vscode';
interface CheckboxState {
    timestamp: number;
}

type CheckboxStates = Record<string, CheckboxState>;
export class CheckboxStateManager {
    private readonly STATE_EXPIRY = 24 * 60 * 60 * 1000 * 30; // 30 days
    private readonly STORAGE_KEY = 'bitbucket.viewedFiles';

    constructor(private context: vscode.ExtensionContext) {
        this.cleanup();
    }

    private async cleanup(): Promise<void> {
        const states = this.context.workspaceState.get<CheckboxStates>(this.STORAGE_KEY, {});
        const now = Date.now();

        const validStates: CheckboxStates = {};
        for (const [id, state] of Object.entries(states)) {
            const isValid = now - state.timestamp < this.STATE_EXPIRY;
            if (isValid) {
                validStates[id] = state;
            } else {
                Logger.debug(`Removing expired checkbox state: ${id}`);
            }
        }

        await this.context.workspaceState.update(this.STORAGE_KEY, validStates);
        Logger.debug(`Cleanup complete. Remaining states: ${Object.keys(validStates).length}`);
    }

    isChecked(id: string): boolean {
        const states = this.context.workspaceState.get<CheckboxStates>(this.STORAGE_KEY, {});
        const state = states[id];

        if (state) {
            if (Date.now() - state.timestamp >= this.STATE_EXPIRY) {
                this.setChecked(id, false);
                return false;
            }
            return true;
        }
        return false;
    }

    setChecked(id: string, checked: boolean): void {
        const states = this.context.workspaceState.get<CheckboxStates>(this.STORAGE_KEY, {});

        if (checked) {
            states[id] = { timestamp: Date.now() };
        } else {
            delete states[id];
        }

        this.context.workspaceState.update(this.STORAGE_KEY, states);
        Logger.debug(`Checkbox state updated: ${id} = ${checked}`);
    }
}
