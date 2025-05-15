import { commands, Disposable, workspace } from 'vscode';

export async function executeVSCodeCommand(command: string): Promise<void> {
    try {
        await commands.executeCommand(command);
    } catch (error) {
        console.error(`Failed to execute VS Code command: ${command}`, error);
    }
}

export async function updateConfig(section: string, key: string, value: any): Promise<void> {
    const config = workspace.getConfiguration(section);
    if (config.get(key) !== value) {
        await config.update(key, value, true);
    }
}

/**
 * Type representing all valid view names in the application.
 *
 * @important When creating a new view, you must add its name to this union type
 * and register its teardown function in the teardownFunctions map.
 */
export enum View {
    Review = 'review',
    Noop = 'noop',
}

export type LifecycleFns = {
    setup: () => Promise<void>;
    shutdown: () => Promise<void>;
};

export const getDefaultLifecycleFns = (): LifecycleFns => ({
    setup: async () => {},
    shutdown: async () => {},
});

export class DevsphereConfigurationManager implements Disposable {
    private currentView: View = View.Noop;

    constructor(private lifecycleFunctions: Record<View, LifecycleFns>) {}

    dispose() {
        this.lifecycleFunctions = {
            [View.Noop]: getDefaultLifecycleFns(),
            [View.Review]: getDefaultLifecycleFns(),
        };
    }

    async setupView(view: View) {
        const oldView = this.currentView;
        this.currentView = view;

        if (oldView !== view) {
            try {
                await this.lifecycleFunctions[oldView].shutdown();
            } catch (error) {
                console.error(`Failed to shutdown view: ${oldView}`, error);
            }
        }

        try {
            // Setup is called even if oldView is the same because a user may have run the individual
            // commands separately and we want a consistent state when the view is re-selected.
            await this.lifecycleFunctions[view].setup();
        } catch (error) {
            console.error(`Failed to setup view: ${view}`, error);
        }
    }
}
