import { AxiosInstance } from 'axios';

import { OAuthProvider } from './authInfo';
import { BitbucketResponseHandler } from './responseHandlers/BitbucketResponseHandler';
import { JiraFPResponseHandler } from './responseHandlers/JiraFPResponseHandler';
import { JiraPKCEResponseHandler } from './responseHandlers/JiraPKCEResponseHandler';
import { ResponseHandler } from './responseHandlers/ResponseHandler';
import { Strategy } from './strategy';

export function responseHandlerForStrategy(
    strategy: Strategy,
    agent: { [k: string]: any },
    axios: AxiosInstance,
): ResponseHandler {
    const provider = strategy.provider();
    if (provider === OAuthProvider.JiraCloud || provider === OAuthProvider.JiraCloudStaging) {
        return new JiraPKCEResponseHandler(strategy, agent, axios);
    }

    if (provider === OAuthProvider.JiraCloudFirstParty) {
        return new JiraFPResponseHandler(strategy, agent, axios);
    }

    if (provider === OAuthProvider.BitbucketCloud || provider === OAuthProvider.BitbucketCloudStaging) {
        return new BitbucketResponseHandler(strategy, agent, axios);
    }
    throw new Error(`Unknown provider when creating response handler: ${provider}`);
}
