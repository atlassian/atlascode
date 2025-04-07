import * as vscode from 'vscode';

import { prUrlCopiedEvent } from '../../analytics';
import { Container } from '../../container';
import { BitbucketPullRequestCommand } from './command-pullrequest';

export class CopyBitbucketPullRequestCommand extends BitbucketPullRequestCommand {
    protected async execute(): Promise<void> {
        const url = await this.pullRequestUrl();
        await vscode.env.clipboard.writeText(url);
        prUrlCopiedEvent().then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    }
}
