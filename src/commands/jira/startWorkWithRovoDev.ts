import { MinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { createRovoDevTemplate } from '../../util/rovoDevTemplate';

export async function startWorkWithRovoDev(issue: MinimalORIssueLink<DetailedSiteInfo>) {
    const fullIssue = issue as MinimalIssue<DetailedSiteInfo>;

    if (!fullIssue) {
        throw new Error(`Jira issue not found`);
    }

    const promptText = createRovoDevTemplate(fullIssue.key, fullIssue.siteDetails);

    Container.rovodevWebviewProvider.setPromptTextWithFocus(promptText);
}
