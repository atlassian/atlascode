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
} from 'vscode';

import { ConfigNamespace, JiraCreateSiteAndProjectKey } from '../constants';
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

    async setLastCreateSiteAndProject(siteAndProject?: SiteIdAndProjectKey) {
        await this.updateEffective(JiraCreateSiteAndProjectKey, siteAndProject, null, true);
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
