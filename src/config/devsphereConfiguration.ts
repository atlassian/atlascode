import { commands, ConfigurationTarget, ExtensionContext, workspace } from 'vscode';

import { Commands } from '../constants';

interface ConfigurationUpdate {
    section: string;
    setting: string;
    value: boolean;
}

/**
 * Type representing all valid view names in the application.
 *
 * @important When creating a new view, you must add its name to this union type
 * and register its teardown function in the teardownFunctions map.
 */
enum Views {
    Review = 'review',
}

class DevsphereConfigurationManager {
    private static _context: ExtensionContext;
    private static _currentTeardownPromise: Promise<void> | null = null;
    private static _currentView: Views | null = null;

    // Map view names to their teardown functions - must include all possible ViewName values
    private static readonly teardownFunctions: Record<Views, () => Promise<void>> = {
        [Views.Review]: DevsphereConfigurationManager.reviewTeardown.bind(DevsphereConfigurationManager),
    };

    // Initialize the configuration manager with the extension context
    public static initialize(context: ExtensionContext): void {
        this._context = context;

        // Restore the current view from storage - cast to ViewName since it's coming from storage
        const savedView = this._context.globalState.get<string | null>('devsphere.currentView', null);
        this._currentView = savedView as Views | null;

        // If we have a view saved, make sure the UI reflects it
        if (this._currentView) {
            console.log(`Restoring view: ${this._currentView}`);
            // TypeScript now knows this._currentView must be in teardownFunctions
            this._currentTeardownPromise = this.getTeardownFunctionForView(this._currentView);
        }
    }

    // Get the appropriate teardown function for a view
    private static getTeardownFunctionForView(viewName: Views | null): Promise<void> | null {
        if (!viewName) {
            return null;
        }

        // No need to check if it exists - TypeScript ensures it does
        return this.teardownFunctions[viewName]();
    }

    // Save current view
    private static saveCurrentViewState(): void {
        if (this._context) {
            this._context.globalState.update('devsphere.currentView', this._currentView);
        }
    }

    private static async executeVSCodeCommand(command: string): Promise<void> {
        try {
            await commands.executeCommand(command);
        } catch (error) {
            console.error(`Failed to execute VS Code command: ${command}`, error);
        }
    }

    private static async updateSingleConfiguration(config: ConfigurationUpdate): Promise<void> {
        try {
            await workspace
                .getConfiguration(config.section)
                .update(config.setting, config.value, ConfigurationTarget.Global);
        } catch (error) {
            console.error(
                `Failed to update configuration - Section: ${config.section}, Setting: ${config.setting}`,
                error,
            );
        }
    }

    private static async hideActivityBar(): Promise<void> {
        await this.executeVSCodeCommand('workbench.action.activityBarLocation.hide');
    }

    private static async showActivityBar(): Promise<void> {
        await this.executeVSCodeCommand('workbench.action.focusActivityBar');
    }

    /**
     * Updates all the configurations / settings changes made for the last view.
     * @param configs - The configurations to update
     * @example
     * ```typescript
     * // Example config changes
     * const configs = [
     *   {
     *     section: 'atlascode.bitbucket.explorer',
     *     setting: 'repositoryBasedPullRequestView.enabled',
     *     value: false
     *   }
     * ];
     * await updateAllConfigurations(configs);
     * ```
     */
    // @ts-ignore: Ignores the fact that this method is not used
    private static async updateAllConfigurations(configs: ConfigurationUpdate[]): Promise<void> {
        await Promise.allSettled(configs.map((config) => this.updateSingleConfiguration(config)));
    }

    private static async focusOnPullRequestsOverview(): Promise<void> {
        await this.executeVSCodeCommand(Commands.BitbucketPullRequestsOverviewFocus);
    }

    /**
     * Resets all the configurations / settings changes made for the last view
     * Useful when navigating to routes which don't have any specific settings
     */
    public static async resetViewConfiguration(): Promise<void> {
        if (this._currentTeardownPromise) {
            await this._currentTeardownPromise;
            this._currentTeardownPromise = null;
            this._currentView = null;
            // Clear stored state when resetting the view
            this.saveCurrentViewState();
        }
    }

    /**
     * Higher-order function to create view initializers with standard behavior
     * Use this to create new view initializers
     *
     * @param viewName - The name of the view to initialize (must be a valid ViewName)
     * @param setupFn - The function to execute when the view is initialized
     * @param teardownFn - The function to execute when the view is teared down
     * @returns A function that initializes the view
     */
    private static createViewInitializer(
        viewName: Views,
        setupFn: () => Promise<void>,
        teardownFn: () => Promise<void>,
    ): () => Promise<void> {
        // TypeScript enforces that viewName must be in teardownFunctions
        // so no need to add it at runtime

        return async () => {
            // Only reset the view if it's not the current view
            if (this._currentView !== viewName) {
                await this.resetViewConfiguration();
                this._currentView = viewName;
                // Save the current view name for persistence
                this.saveCurrentViewState();
            }

            // Execute the specific setup logic
            await setupFn();

            // Set up teardown promise to be called when the view is teared down
            this._currentTeardownPromise = teardownFn();

            return;
        };
    }

    // --- Review View Configurations ---
    private static async reviewSetup(): Promise<void> {
        await DevsphereConfigurationManager.hideActivityBar();
        await DevsphereConfigurationManager.focusOnPullRequestsOverview();
    }

    private static async reviewTeardown(): Promise<void> {
        await DevsphereConfigurationManager.showActivityBar();
    }

    public static initializeReviewSettings = DevsphereConfigurationManager.createViewInitializer(
        Views.Review,
        DevsphereConfigurationManager.reviewSetup.bind(DevsphereConfigurationManager),
        DevsphereConfigurationManager.reviewTeardown.bind(DevsphereConfigurationManager),
    );
}

export function registerDevsphereCommands(context: ExtensionContext): void {
    // Initialize the configuration manager with the context
    DevsphereConfigurationManager.initialize(context);

    context.subscriptions.push(
        commands.registerCommand(Commands.InitialiseDevsphereReviewSettings, () =>
            DevsphereConfigurationManager.initializeReviewSettings(),
        ),
        commands.registerCommand(Commands.ResetDevsphereCustomConfiguration, () =>
            DevsphereConfigurationManager.resetViewConfiguration(),
        ),
    );
}
