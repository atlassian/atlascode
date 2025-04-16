import { ExtensionContext, window } from 'vscode';

import { FileDecorationProvider } from '../../views/decorators/FileDecorationProvider';

function registerDecorationProviders(context: ExtensionContext) {
    const decorationProvider = new FileDecorationProvider();
    context.subscriptions.push(window.registerFileDecorationProvider(decorationProvider));
}

export function activate(context: ExtensionContext) {
    registerDecorationProviders(context);
}
