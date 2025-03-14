import { commands, ExtensionContext } from 'vscode';
import { CopyBitbucketPullRequestCommand } from './command-copy-pullreqest';
import { OpenInBitbucketCommand } from './command-open';
import { OpenBitbucketChangesetCommand } from './command-open-changeset';
import { OpenBitbucketPullRequestCommand } from './command-open-pullrequest';

enum CodebucketCommands {
    OpenInBitbucket = 'atlascode.bb.openInBitbucket',
    OpenChangeset = 'atlascode.bb.openChangeset',
    ViewPullRequest = 'atlascode.bb.viewPullRequest',
    CopyPullRequest = 'atlascode.bb.copyPullRequest',
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
}
