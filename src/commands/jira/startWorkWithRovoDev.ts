import { MinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { buildRovoDevPrompt } from '../../util/rovoDevPrompt';

export async function startWorkWithRovoDev(issue: MinimalORIssueLink<DetailedSiteInfo>) {
    const fullIssue = issue as MinimalIssue<DetailedSiteInfo>;

    if (!fullIssue) {
        throw new Error(`Jira issue not found`);
    }

    const client = await Container.clientManager.jiraClient(fullIssue.siteDetails);
    const fullIssueData = await client.getIssue(fullIssue.key, ['description'], '');

    const summary = fullIssue.summary || '';
    const description = fullIssueData.fields.description || '';

    const prompt = buildRovoDevPrompt(summary, description);
    Container.rovodevWebviewProvider.invokeRovoDevAskCommand(prompt);
}
