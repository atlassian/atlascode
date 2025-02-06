import { workspace, Uri, ConfigurationTarget, window, Extension, extensions, commands, l10n } from 'vscode';
import { Resources } from '../../resources';

export const VSCODE_YAML_EXTENSION_ID = 'redhat.vscode-yaml';

export const YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION = 'yaml.schemas';

export const BB_PIPELINES_FILENAME = 'bitbucket-pipelines.yml';

export async function addPipelinesSchemaToYamlConfig() {
    const config = workspace.getConfiguration().inspect(YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION);

    await addPipelinesSchemaToConfigAtScope(
        Uri.file(Resources.pipelinesSchemaPath).toString(),
        BB_PIPELINES_FILENAME,
        ConfigurationTarget.Global,
        config!.globalValue,
    );
}

async function addPipelinesSchemaToConfigAtScope(
    key: string,
    value: string,
    scope: ConfigurationTarget,
    valueAtScope: any,
) {
    let newValue: any = {};
    if (valueAtScope) {
        newValue = Object.assign({}, valueAtScope);
    }
    Object.keys(newValue).forEach((configKey) => {
        var configValue = newValue[configKey];
        if (value === configValue) {
            delete newValue[configKey];
        }
    });
    newValue[key] = value;
    await workspace.getConfiguration().update(YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION, newValue, scope);
}

// Find redhat.vscode-yaml extension and try to activate it
export async function activateYamlExtension() {
    const ext: Extension<any> | undefined = extensions.getExtension(VSCODE_YAML_EXTENSION_ID);
    if (!ext) {
        window
            .showWarningMessage(
                "Please install 'YAML Support by Red Hat' via the Extensions pane.",
                'install yaml extension',
            )
            .then((sel) => {
                commands.executeCommand('workbench.extensions.installExtension', VSCODE_YAML_EXTENSION_ID);
            });
        return;
    }
    const yamlPlugin = await ext.activate();

    if (!yamlPlugin || !yamlPlugin.registerContributor) {
        window.showWarningMessage(
            l10n.t(
                "The installed Red Hat YAML extension doesn't support Intellisense. Please upgrade 'YAML Support by Red Hat' via the Extensions pane.",
            ),
        );
        return;
    }
    return yamlPlugin;
}
