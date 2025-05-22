import { ExtensionContext, window } from 'vscode';

import { FileDecorationProvider } from '../../views/decorators/FileDecorationProvider';

export function activate(context: ExtensionContext) {
    const decorationProvider = new FileDecorationProvider();
    context.subscriptions.push(window.registerFileDecorationProvider(decorationProvider));
}
