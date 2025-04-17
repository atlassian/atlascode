export * from './model';

import {
    ConfigurationChangeEvent,
    ConfigurationTarget,
    Disposable,
    Event,
    EventEmitter,
    ExtensionContext,
    Uri,
    workspace,
    WorkspaceConfiguration,
} from 'vscode';

import {
    ConfigNamespace,
    JiraCreateSiteAndProjectKey,
    JiraLegacyWorkingSiteConfigurationKey,
    JiraV1WorkingProjectConfigurationKey,
} from '../constants';
import { SiteIdAndProjectKey } from './model';

/*
Configuration is a helper to manage configuration changes in various parts of the system.
It basically abstracts away the details of dealing with the workspace settings driectly.
*/
export class Configuration extends Disposable {
    static configure(context: ExtensionContext) {
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration),
        );
    }

    // ondidChange provides a way for consumers to register event listeners for config changes.
    private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();
    get onDidChange(): Event<ConfigurationChangeEvent> {
        return this._onDidChange.event;
    }

    constructor() {
        super(() => this.dispose());
    }

    dispose() {
        this._onDidChange.dispose();
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent): void {
        // only fire if it's a config for our extension
        if (!e.affectsConfiguration(ConfigNamespace, null!)) {
            return;
        }

        this._onDidChange.fire(e);
    }

    // initializingChangeEvent is an event instance that can be used to determine if the config
    // is being initialized for the first time rather than actually receiving a *real* change event.
    readonly initializingChangeEvent: ConfigurationChangeEvent = {
        affectsConfiguration: (section: string, resource?: Uri) => false,
    };

    // get returns a strongly type config section/value
    get<T>(section?: string, resource?: Uri | null, defaultValue?: T): T {
        return defaultValue === undefined
            ? workspace
                  .getConfiguration(section === undefined ? undefined : ConfigNamespace, resource!)
                  .get<T>(section === undefined ? ConfigNamespace : section)!
            : workspace
                  .getConfiguration(section === undefined ? undefined : ConfigNamespace, resource!)
                  .get<T>(section === undefined ? ConfigNamespace : section, defaultValue)!;
    }

    // changed can be called to see if the passed in section (minus the ConfigNamespace) was affect by the change
    changed(e: ConfigurationChangeEvent, section: string, resource?: Uri | null): boolean {
        return e.affectsConfiguration(`${ConfigNamespace}.${section}`, resource!);
    }

    // initializing takes an event and returns if it is an initalizing event or not
    initializing(e: ConfigurationChangeEvent): boolean {
        return e === this.initializingChangeEvent;
    }

    // inspect returns details of the given config section
    inspect<T>(
        section?: string,
        resource?: Uri | null,
    ): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } {
        const inspect = workspace
            .getConfiguration(section === undefined ? undefined : ConfigNamespace, resource!)
            .inspect<T>(section === undefined ? ConfigNamespace : section);

        return inspect ? inspect : { key: '' };
    }

    // update does what it sounds like
    public async update(
        section: string,
        value: any,
        target: ConfigurationTarget,
        resource?: Uri | null,
    ): Promise<void> {
        const inspect = this.inspect(section, resource);
        if (
            value === undefined &&
            ((target === ConfigurationTarget.Global && inspect.globalValue === undefined) ||
                (target === ConfigurationTarget.Workspace && inspect.workspaceValue === undefined))
        ) {
            return undefined;
        }

        return await workspace
            .getConfiguration(ConfigNamespace, target === ConfigurationTarget.Global ? undefined : resource!)
            .update(section, value, target);
    }

    // Moving from V1 to V2 working site became default site.
    async clearVersion1WorkingSite() {
        await this.updateForWorkspace(JiraLegacyWorkingSiteConfigurationKey, undefined);
    }

    // Migrates the workspace level site settings. This needs to be done for every workspace /directory
    // the first time it's opened unlike global migrations that can happen on first run of the extension only.
    async migrateLocalVersion1WorkingSite(deletePrevious: boolean) {
        let inspect = configuration.inspect(JiraLegacyWorkingSiteConfigurationKey);
        if (inspect.workspaceValue) {
            const config = this.configForOpenWorkspace();
            if (config && deletePrevious) {
                await config.update(JiraLegacyWorkingSiteConfigurationKey, undefined);
            }
        }
        inspect = configuration.inspect(JiraV1WorkingProjectConfigurationKey);
        if (inspect.workspaceValue) {
            const config = this.configForOpenWorkspace();
            if (config && deletePrevious) {
                await config.update(JiraV1WorkingProjectConfigurationKey, undefined);
            }
        }
    }

    async setLastCreateSiteAndProject(siteAndProject?: SiteIdAndProjectKey) {
        await this.updateEffective(JiraCreateSiteAndProjectKey, siteAndProject, null, true);
    }

    async clearVersion1WorkingProject() {
        // for now, we keep the global v1 project so we can use it to migrate jql later
        await this.update(JiraV1WorkingProjectConfigurationKey, undefined, ConfigurationTarget.Workspace);
    }

    private configForOpenWorkspace(): WorkspaceConfiguration | undefined {
        const f = workspace.workspaceFolders;
        if (f && f.length > 0) {
            return workspace.getConfiguration(ConfigNamespace, f[0].uri);
        }
        return undefined;
    }

    // Will attempt to update the value for both the Workspace and Global. If that fails (no folder is open) it will only set the value globaly.
    private async updateForWorkspace(section: string, value: any) {
        const config = this.configForOpenWorkspace();
        if (config) {
            await Promise.all([
                config.update(section, value, ConfigurationTarget.Workspace),
                config.update(section, value, ConfigurationTarget.Global),
            ]);
        } else {
            await this.updateEffective(section, value);
        }
    }

    // this tries to figure out where the current value is set and update it there
    async updateEffective(section: string, value: any, resource: Uri | null = null, force?: boolean): Promise<void> {
        const inspect = this.inspect(section, resource);

        if (inspect.workspaceFolderValue !== undefined) {
            if (value === inspect.workspaceFolderValue) {
                return undefined;
            }

            return configuration.update(section, value, ConfigurationTarget.WorkspaceFolder, resource);
        }

        if (inspect.workspaceValue !== undefined) {
            if (value === inspect.workspaceValue) {
                return undefined;
            }

            return configuration.update(section, value, ConfigurationTarget.Workspace);
        }

        if (inspect.globalValue === value || (inspect.globalValue === undefined && !force)) {
            return undefined;
        }

        return configuration.update(section, value, ConfigurationTarget.Global);
    }
}

export const configuration = new Configuration();
