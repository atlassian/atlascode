import { Commands } from '../../commands';
import { executeVSCodeCommand, LifecycleFns, updateConfig } from './devsphereConfigurationManager';

async function reviewSetup(): Promise<void> {
    await Promise.all([
        executeVSCodeCommand(Commands.BitbucketPullRequestsOverviewFocus),
        updateConfig('workbench.editor', 'showTabs', 'single'),
        executeVSCodeCommand('workbench.action.closePanel'),
        executeVSCodeCommand('workbench.action.closeAuxiliaryBar'),
    ]);
}

async function reviewTeardown(): Promise<void> {
    await Promise.allSettled([
        updateConfig('workbench.editor', 'showTabs', 'multiple'),
        executeVSCodeCommand('workbench.files.action.focusFilesExplorer'),
    ]);
}

export const reviewLifecycleFns: LifecycleFns = {
    setup: reviewSetup,
    shutdown: reviewTeardown,
};
