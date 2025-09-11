import { addCommentToPullRequest } from './addCommentToPullRequest.spec';
import { approvePullRequest } from './approvePullRequest.spec';
import { authFlow } from './authFlow.spec';
import { cleanupWorkspace } from './cleanupWorkspace.spec';
import { connectRepository } from './connectRepository.spec';
import { createPullRequest } from './createPullRequest.spec';
import { startWorkFlow } from './startWorkFlow.spec';
import { viewPullRequset } from './viewPullRequest.spec';

export const bitbucketScenarios = [
    { name: 'Authenticate with Bitbucket', run: authFlow },
    { name: 'Connect repository', run: connectRepository },
    { name: 'Create PullRequest', run: createPullRequest },
    { name: 'View PullRequset', run: viewPullRequset },
    { name: 'Add comment to PullRequest', run: addCommentToPullRequest },
    { name: 'Approve PullRequset', run: approvePullRequest },
    { name: 'Start work Flow', run: startWorkFlow },
];

export const bitbucketScenariosDC = [
    { name: 'Cleanup', run: cleanupWorkspace },
    { name: 'Authenticate with Bitbucket', run: authFlow },
];
