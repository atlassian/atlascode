import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { Logger } from '../logger';
import { Comment, Commit, PullRequest } from './model';

export async function extractIssueKeys(pr: PullRequest, commits: Commit[], allComments: Comment[]): Promise<string[]> {
    const result = new Set<string>();

    try {
        const text = commits.map((c) => c.message).join('\n');
        const commitMessageMatches = parseJiraIssueKeys(text);
        commitMessageMatches.forEach((m) => result.add(m));

        const prTitleMatches = parseJiraIssueKeys(pr.data.title);
        prTitleMatches.forEach((m) => result.add(m));

        const prSummaryMatches = parseJiraIssueKeys(pr.data.rawSummary);
        prSummaryMatches.forEach((m) => result.add(m));

        const prCommentsMatches = allComments
            .map((c) => parseJiraIssueKeys(c.rawContent))
            .reduce((prev, curr) => prev.concat(curr), []);
        prCommentsMatches.forEach((m) => result.add(m));

        return Array.from(result);
    } catch (e) {
        Logger.debug('error fetching related Jira issues: ', e);
        return [];
    }
}
