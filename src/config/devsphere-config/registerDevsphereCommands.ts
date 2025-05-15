import { commands, ExtensionContext } from 'vscode';

import { Commands } from '../../commands';
import { reviewLifecycleFns } from './devsphereConfigReview';
import {
    DevsphereConfigurationManager,
    getDefaultLifecycleFns,
    LifecycleFns,
    View,
} from './devsphereConfigurationManager';

// Map view names to their teardown functions - must include all possible ViewName values
const lifecycleFunctions: Record<View, LifecycleFns> = {
    [View.Review]: reviewLifecycleFns,
    [View.Noop]: getDefaultLifecycleFns(),
};

export function registerDevsphereCommands(context: ExtensionContext): void {
    const devsphereConfigManager = new DevsphereConfigurationManager(lifecycleFunctions);

    context.subscriptions.push(devsphereConfigManager);

    context.subscriptions.push(
        commands.registerCommand(Commands.InitialiseDevsphereReviewSettings, () =>
            devsphereConfigManager.setupView(View.Review),
        ),
        commands.registerCommand(Commands.ResetDevsphereCustomConfiguration, () =>
            devsphereConfigManager.setupView(View.Noop),
        ),
    );
}
