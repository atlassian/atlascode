import { Container } from '../container';
import { getAxiosInstance } from '../jira/jira-client/providers';
import { OAuthProvider } from './authInfo';
import { BitbucketResponseHandler } from './responseHandlers/BitbucketResponseHandler';
import { strategyForProvider } from './strategy';

/**
 * This is a very oppurtunistic function. This uses different parts of the code written for different purposes
 * and combines it together instead of rewriting the same code. This ensures that this function will evolve as the code changes.
 *
 * Strategy is something catered towarda OAuth flow but their profile / user URLs are universal. So, we use it
 * to get the URls. Then, `BitbucketResponseHandler` is written exactly to extract the user info given an oauth token.
 * But the way it is implemented, it does not matter; we can send our auth header ourselves. And so we do.
 *
 * `getAxiosInstance` and `Container.analyticsClient` are generic substritutes for their types throughout the code
 * and so we use them as well.
 */
export function getUserForBBToken(authHeader: string) {
    const axiosInstance = getAxiosInstance();

    const handler = new BitbucketResponseHandler(
        strategyForProvider(OAuthProvider.BitbucketCloud),
        Container.analyticsClient,
        axiosInstance,
    );

    return handler.user(authHeader);
}
