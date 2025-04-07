import { AxiosInstance } from 'axios';

import { OAuthProvider } from './authInfo';
import { BitbucketResponseHandler } from './responseHandlers/BitbucketResponseHandler';
import { JiraPKCEResponseHandler } from './responseHandlers/JiraPKCEResponseHandler';
import { ResponseHandler } from './responseHandlers/ResponseHandler';
import { Strategy } from './strategy';

export function responseHandlerForStrategy(
    strategy: Strategy,
    agent: { [k: string]: any },
    axios: AxiosInstance,
): ResponseHandler {
    if (strategy.provider() === OAuthProvider.JiraCloud || strategy.provider() === OAuthProvider.JiraCloudStaging) {
        return new JiraPKCEResponseHandler(strategy, agent, axios);
    }
    if (
        strategy.provider() === OAuthProvider.BitbucketCloud ||
        strategy.provider() === OAuthProvider.BitbucketCloudStaging
    ) {
        return new BitbucketResponseHandler(strategy, agent, axios);
    }
    throw new Error(`Unknown provider when creating response handler: ${strategy.provider()}`);
}
