import { Logger } from 'src/logger';
import { commands, ConfigurationTarget, Extension, extensions, Uri, window, workspace } from 'vscode';

import { Resources } from '../../resources';
import BBPipelinesSchema from './pipelines-schema.json' with { type: 'json' };

const VSCODE_YAML_EXTENSION_ID = 'redhat.vscode-yaml';

const YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION = 'yaml.schemas';

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
    // AXON-1817
    // check if user has path to BB pipelines schema previously added by this extension.
    const outdatedConfigurationKeys = Object.keys(newValue)
        .map((configKey) => {
            const isExpectedValue = newValue[configKey] === 'bitbucket-pipelines.yml';
            if (configKey.includes('atlascode') && isExpectedValue) {
                return configKey;
            }
            return;
        })
        .filter((item) => Boolean(item));

    if (outdatedConfigurationKeys.length) {
        for (const outdatedKey of outdatedConfigurationKeys) {
            if (outdatedKey) {
                delete newValue[outdatedKey];
            }
        }
        try {
            if (Object.keys(newValue).length > 0) {
                // updating configuration with other previously existed values.
                await workspace
                    .getConfiguration()
                    .update(YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION, newValue, scope);
            } else {
                // remove 'yaml.schemas' entirely
                await workspace
                    .getConfiguration()
                    .update(YAML_SCHEMA_CONFIG_NAME_OF_VSCODE_YAML_EXTENSION, undefined, scope);
            }
        } catch (error) {
            Logger.error(error, `Attempt to remove old 'yaml.schemas' configuration failed: ${error.message}`);
        }
    }
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
            .then(() => {
                commands.executeCommand('workbench.extensions.installExtension', VSCODE_YAML_EXTENSION_ID);
            });
        return;
    }
    const yamlPlugin = await ext.activate();

    if (!yamlPlugin || !yamlPlugin.registerContributor) {
        window.showWarningMessage(
            "The installed Red Hat YAML extension doesn't support Intellisense. Please upgrade 'YAML Support by Red Hat' via the Extensions pane.",
        );
        return;
    }

    // Add new schema for syntax highlighting in bitbucket-pipelines.yml files.
    // https://github.com/redhat-developer/vscode-yaml/wiki/Extension-API#register-contributor
    const SCHEMA = 'BitbucketPipelinesAtlascode';
    const onRequestSchemaURI = (resource: string): string | undefined => {
        if (resource.endsWith(BB_PIPELINES_FILENAME)) {
            return `${SCHEMA}://schema/porter`;
        }
        return undefined;
    };

    const onRequestSchemaContent = (schemaUri: string): string | undefined => {
        const parsedUri = Uri.parse(schemaUri);
        if (parsedUri.scheme !== SCHEMA) {
            return undefined;
        }
        if (!parsedUri.path || !parsedUri.path.startsWith('/')) {
            return undefined;
        }
        const schema = JSON.stringify(BBPipelinesSchema);
        return schema;
    };

    yamlPlugin.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);
    return yamlPlugin;
}
