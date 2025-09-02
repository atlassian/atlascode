import { ProductBitbucket, ProductJira } from 'src/atlclients/authInfo';
import { Commands } from 'src/constants';
import { commands, Disposable, window } from 'vscode';

import { AuthFlow, AuthFlowData } from './authentication';

export function registerQuickAuthCommand(): Disposable {
    return Disposable.from(
        commands.registerCommand(
            Commands.QuickAuth,
            async (initialState: Partial<AuthFlowData>, origin: string = 'command') => {
                if (initialState?.product === ProductBitbucket) {
                    // Unsupported for now, shouldn't ever end up here
                    window.showErrorMessage('Quick Auth is only supported for Jira at the moment.');
                    return;
                }

                const flow = new AuthFlow({
                    origin,
                });
                await flow.run({
                    ...initialState,
                    product: ProductJira,
                });
            },
        ),
    );
}
