import { MinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import TurndownService from 'turndown';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';

export async function startWorkWithRovoDev(issue: MinimalORIssueLink<DetailedSiteInfo>) {
    const fullIssue = issue as MinimalIssue<DetailedSiteInfo>;

    if (!fullIssue) {
        throw new Error(`Jira issue not found`);
    }

    const buildPrompt = (summary: string, description: string): string => {
        return (
            `
            Let's work on this issue:

            Summary:
            ${summary}
            ` +
            (description
                ? `
            Description:
            ${description}
            `
                : '') +
            `
            Please provide a detailed plan to resolve this issue, including any necessary steps, code snippets, or references to documentation.
            Make sure to consider the context of the issue and provide a comprehensive solution.
            Feel free to ask for any additional information if needed.
        `
        );
    };

    const summary = fullIssue.summary || '';

    let description = '';
    if (fullIssue.descriptionHtml) {
        const turnDownService = new TurndownService();
        description = turnDownService.turndown(fullIssue.descriptionHtml);
    }

    const prompt = buildPrompt(summary, description);

    Container.rovodevWebviewProvider.invokeRovoDevAskCommand(prompt);
}
