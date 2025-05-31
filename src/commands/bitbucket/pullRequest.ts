import { CheckoutHelper } from 'src/bitbucket/interfaces';
import { Uri } from 'vscode';

export const extractPullRequestComponents = (url: string): { repoUrl: string; prId: number } => {
    const repoUrl = url.slice(0, url.indexOf('/pull-requests'));
    const prUrlPath = Uri.parse(url).path;
    const prId = prUrlPath.split('/pull-requests/')[1]?.split('/')[0];
    return { repoUrl, prId: parseInt(prId) };
};

/**
 * Opens a pull request using the provided URL
 * @param pullRequestUrl URL of the pull request to open
 */
export const openPullRequest = async (bitbucketHelper: CheckoutHelper, pullRequestUrl: string): Promise<void> => {
    const { repoUrl, prId } = extractPullRequestComponents(pullRequestUrl);
    await bitbucketHelper.pullRequest(repoUrl, prId);
};
