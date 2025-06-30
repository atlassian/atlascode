import { readFileSync } from 'fs';
import Mustache from 'mustache';
import { join as pathJoin } from 'path';
import { Uri } from 'vscode';

import { Resources } from '../../resources';

export function getHtmlForView(
    extensionPath: string,
    baseUri: Uri,
    cspSource: string,
    viewId: string,
    styles?: Uri,
): string {
    const manifest = JSON.parse(readFileSync(pathJoin(extensionPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];

    const template = Resources.html.get('reactWebviewHtml');

    if (template) {
        return Mustache.render(template, {
            view: viewId,
            scriptUri: `build/${mainScript}`,
            baseUri: baseUri,
            cspSource: cspSource,
            styleUri: styles || '',
        });
    } else {
        return Mustache.render(Resources.htmlNotFound, { resource: 'reactWebviewHtml' });
    }
}
