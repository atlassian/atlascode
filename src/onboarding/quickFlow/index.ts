import { Commands } from 'src/constants';
import { commands, Disposable } from 'vscode';

import { AuthFlow, AuthFlowData } from './authentication';
import { AuthType } from './authentication/types';

export function registerQuickAuthCommand(): Disposable {
    return Disposable.from(
        commands.registerCommand(Commands.QuickAuth, async (initialState: Partial<AuthFlowData>) => {
            const flow = new AuthFlow();
            await flow.run(initialState);
        }),
        commands.registerCommand(Commands.QuickAuth2, async () => {
            const flow = new AuthFlow();
            await flow.run({
                authenticationType: AuthType.ApiToken,
                username: 'bruh@atlassian.com',
            });
        }),
        commands.registerCommand(Commands.QuickAuth3, async () => {
            const flow = new AuthFlow();
            await flow.run({
                skipAllowed: true,
                authenticationType: AuthType.ApiToken,
                username: 'bruh@atlassian.com',
            });
        }),
    );
}
