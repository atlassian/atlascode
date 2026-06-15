jest.mock('mustache', () => {
    const actual = jest.requireActual('mustache');

    return {
        __esModule: true,
        default: actual,
    };
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Resources } from 'src/resources';
import { JIRA_CODING_AGENT_PRODUCT_NAME, ROVODEV_STATIC_CONFIG_GLOBAL } from 'src/rovo-dev/api/rovodevStaticConfig';
import { Uri } from 'vscode';

import { getHtmlForView } from './getHtmlForView';

describe('getHtmlForView', () => {
    const originalRebrandValue = process.env.ROVODEV_REBRAND_JCA;
    let extensionPath: string;

    beforeEach(() => {
        extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'atlascode-get-html-for-view-'));
        fs.mkdirSync(path.join(extensionPath, 'build'));
        fs.writeFileSync(
            path.join(extensionPath, 'build', 'asset-manifest.json'),
            JSON.stringify({ 'mui.js': 'mui.bundle.js' }),
        );

        Resources.html.set(
            'reactWebviewHtml',
            '<meta http-equiv="Content-Security-Policy" content="script-src {{cspSource}} \'nonce-{{nonce}}\';" />' +
                '<script nonce="{{nonce}}">window.{{rovodevStaticConfigGlobal}} = {{{rovodevStaticConfigJson}}};</script>' +
                '<script src="{{scriptUri}}"></script>',
        );
    });

    afterEach(() => {
        fs.rmSync(extensionPath, { recursive: true, force: true });
        Resources.html.delete('reactWebviewHtml');

        if (originalRebrandValue === undefined) {
            delete process.env.ROVODEV_REBRAND_JCA;
        } else {
            process.env.ROVODEV_REBRAND_JCA = originalRebrandValue;
        }
    });

    it('injects runtime product config before the React bundle loads', () => {
        process.env.ROVODEV_REBRAND_JCA = 'true';

        const html = getHtmlForView(
            extensionPath,
            Uri.parse('vscode-webview://extension'),
            'vscode-webview://csp-source',
            'rovodev',
        );

        expect(html).toContain(`window.${ROVODEV_STATIC_CONFIG_GLOBAL} = `);
        expect(html).toContain(`"productName":"${JIRA_CODING_AGENT_PRODUCT_NAME}"`);
        const staticConfigIndex = html.indexOf(`window.${ROVODEV_STATIC_CONFIG_GLOBAL}`);
        const bundleScriptIndex = html.indexOf('mui.bundle.js');

        expect(staticConfigIndex).toBeGreaterThanOrEqual(0);
        expect(bundleScriptIndex).toBeGreaterThanOrEqual(0);
        expect(staticConfigIndex).toBeLessThan(bundleScriptIndex);
    });

    it('uses the same nonce for CSP and injected config script', () => {
        const html = getHtmlForView(
            extensionPath,
            Uri.parse('vscode-webview://extension'),
            'vscode-webview://csp-source',
            'rovodev',
        );

        const cspNonce = html.match(/script-src [^']+'nonce-([^']+)'/)?.[1];
        const scriptNonce = html.match(/<script nonce="([^"]+)">/)?.[1];

        expect(cspNonce).toBeTruthy();
        expect(scriptNonce).toBe(cspNonce);
    });
});
