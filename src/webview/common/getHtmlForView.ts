import { readFileSync } from 'fs';
import Mustache from 'mustache';
import { join as pathJoin } from 'path';
import { Uri } from 'vscode';
import { Resources } from '../../resources';
import * as vscode from 'vscode';

export function getHtmlForView(extensionPath: string, baseUri: Uri, cspSource: string, viewId: string): string {
    const manifest = JSON.parse(readFileSync(pathJoin(extensionPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];

    const template = Resources.html.get('reactWebviewHtml');
    const l10ndata = JSON.stringify(vscode.l10n.bundle || undefined);

    if (template) {
        return Mustache.render(template, {
            view: viewId,
            scriptUri: `build/${mainScript}`,
            baseUri: baseUri,
            cspSource: cspSource,
            l10ndata: l10ndata ? btoa(l10ndata) : undefined,
        });
    } else {
        return Mustache.render(Resources.htmlNotFound, { resource: 'reactWebviewHtml' });
    }
}
