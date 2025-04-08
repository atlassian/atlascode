import { commands } from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, BitbucketSite } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { CreateBitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/createbitbucketIssueActionApi';

export class VSCCreateBitbucketIssueActionImpl implements CreateBitbucketIssueActionApi {
    async createIssue(
        site: BitbucketSite,
        title: string,
        description: string,
        kind: string,
        priority: string,
    ): Promise<BitbucketIssue> {
        const bbApi = await clientForSite(site);
        const issue = await bbApi.issues!.create(site, title, description, kind, priority);

        commands.executeCommand(Commands.ShowBitbucketIssue, issue);
        commands.executeCommand(Commands.BitbucketIssuesRefresh);

        Container.createBitbucketIssueWebviewFactory.hide();

        return issue;
    }
}
