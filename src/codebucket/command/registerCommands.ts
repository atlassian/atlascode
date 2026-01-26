import { commands, ExtensionContext, Uri } from 'vscode';

import { Container } from '../../container';
import { Features } from '../../util/featureFlags';
import { CopyBitbucketPullRequestCommand } from './command-copy-pullreqest';
import { CopySourceLinkCommand } from './command-copy-source-link';
import { OpenInBitbucketCommand } from './command-open';
import { OpenBitbucketChangesetCommand } from './command-open-changeset';
import { OpenBitbucketPullRequestCommand } from './command-open-pullrequest';

enum CodebucketCommands {
    OpenInBitbucket = 'atlascode.bb.openInBitbucket',
    OpenChangeset = 'atlascode.bb.openChangeset',
    ViewPullRequest = 'atlascode.bb.viewPullRequest',
    CopyPullRequest = 'atlascode.bb.copyPullRequest',
    CopySourceLink = 'atlascode.bb.copySourceLink',
}

export function activate(context: ExtensionContext) {
    const openInBitbucket = new OpenInBitbucketCommand();
    const openInBitbucketCmd = commands.registerCommand(CodebucketCommands.OpenInBitbucket, () =>
        openInBitbucket.run(),
    );
    context.subscriptions.push(openInBitbucketCmd);

    const openChangeset = new OpenBitbucketChangesetCommand();
    const openChangesetCmd = commands.registerCommand(CodebucketCommands.OpenChangeset, () => openChangeset.run());
    context.subscriptions.push(openChangesetCmd);

    const openPullRequest = new OpenBitbucketPullRequestCommand();
    const openPullRequestCmd = commands.registerCommand(CodebucketCommands.ViewPullRequest, () =>
        openPullRequest.run(),
    );
    context.subscriptions.push(openPullRequestCmd);

    const copyPullRequest = new CopyBitbucketPullRequestCommand();
    const copyPullRequestCmd = commands.registerCommand(CodebucketCommands.CopyPullRequest, () =>
        copyPullRequest.run(),
    );
    context.subscriptions.push(copyPullRequestCmd);

    const copySourceLinkEnabled = Container.featureFlagClient.checkGate(Features.CopySourceLinkCommand);
    if (copySourceLinkEnabled) {
        const copySourceLink = new CopySourceLinkCommand();
        const copySourceLinkCmd = commands.registerCommand(CodebucketCommands.CopySourceLink, (uri?: Uri) => {
            copySourceLink.setContextUri(uri);
            return copySourceLink.run();
        });
        context.subscriptions.push(copySourceLinkCmd);
    }
}
