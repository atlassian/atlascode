import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import Mustache from 'mustache';
import { join as pathJoin } from 'path';
import { getRovoDevWebviewStaticConfig, ROVODEV_STATIC_CONFIG_GLOBAL } from 'src/rovo-dev/api/rovodevStaticConfig';
import { Uri } from 'vscode';

import { Resources } from '../../resources';

function getNonce(): string {
    return randomBytes(16).toString('base64');
}

function getScriptSafeJson(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function getHtmlForView(
    extensionPath: string,
    baseUri: Uri,
    cspSource: string,
    viewId: string,
    styles?: Uri,
): string {
    const manifest = JSON.parse(readFileSync(pathJoin(extensionPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];
    const nonce = getNonce();

    const template = Resources.html.get('reactWebviewHtml');

    if (template) {
        return Mustache.render(template, {
            view: viewId,
            scriptUri: `build/${mainScript}`,
            baseUri: baseUri,
            cspSource: cspSource,
            styleUri: styles || '',
            nonce,
            rovodevStaticConfigGlobal: ROVODEV_STATIC_CONFIG_GLOBAL,
            rovodevStaticConfigJson: getScriptSafeJson(getRovoDevWebviewStaticConfig()),
        });
    } else {
        return Mustache.render(Resources.htmlNotFound, { resource: 'reactWebviewHtml' });
    }
}
