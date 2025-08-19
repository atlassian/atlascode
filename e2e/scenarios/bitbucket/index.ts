import { authFlow } from './authFlow.spec';
import { connectRepository } from './connectRepository.spec';
import { createPullRequest } from './createPullRequest.spec';
import { viewPullRequset } from './viewPullRequest.spec';

export const bitbucketScenarios = [
    { name: 'Authenticate with Bitbucket', run: authFlow },
    { name: 'Connect repository', run: connectRepository },
    { name: 'Create PullRequest', run: createPullRequest },
    { name: 'View PullRequset', run: viewPullRequset },
];
