import { DetailedSiteInfo } from '../atlclients/authInfo';

/**
 * Creates a simple template message for RovoDev with issue link
 * @param issueKey The Jira issue key (e.g., "ABC-123")
 * @param siteDetails Site details containing base URL
 * @returns Template string for RovoDev prompt
 */
export function createRovoDevTemplate(issueKey: string, siteDetails: DetailedSiteInfo): string {
    const issueUrl = `${siteDetails.baseLinkUrl}/browse/${issueKey}`;
    return `Please work on [${issueKey}](${issueUrl})`;
}
