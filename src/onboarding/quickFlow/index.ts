import { ProductBitbucket, ProductJira } from 'src/atlclients/authInfo';
import { Commands } from 'src/constants';
import { commands, Disposable, window } from 'vscode';

import { AuthFlow, AuthFlowData } from './authentication';
import { QuickFlowStatus } from './types';

type QuickAuthOrigin = 'settings' | 'nudge' | 'command';

export async function runQuickAuth({
    initialState,
    origin = 'command',
}: {
    initialState: Partial<AuthFlowData>;
    origin?: QuickAuthOrigin;
}): Promise<QuickFlowStatus> {
    if (initialState?.product === ProductBitbucket) {
        // Unsupported for now, shouldn't ever end up here
        window.showErrorMessage('Quick Auth is only supported for Jira at the moment.');
        return QuickFlowStatus.Cancelled;
    }

    const flow = new AuthFlow({
        origin,
    });
    return await flow.run({
        ...initialState,
        product: ProductJira,
    });
}

export function registerQuickAuthCommand(): Disposable {
    return Disposable.from(
        commands.registerCommand(
            Commands.QuickAuth,
            async (initialState: Partial<AuthFlowData>, origin: QuickAuthOrigin) => {
                await runQuickAuth({ initialState, origin });
            },
        ),
    );
}
