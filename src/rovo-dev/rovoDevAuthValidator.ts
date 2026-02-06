import { AuthInfo, AuthInfoState } from 'src/atlclients/authInfo';

import { RovoDevLogger } from './util/rovoDevLogger';

export interface RovoDevAuthInfo extends AuthInfo {
    user: {
        id: string;
        displayName: string;
        email: string;
        avatarUrl: string;
    };
    state: AuthInfoState;
    username: string;
    password: string;
    isStaging?: boolean;
}

interface GraphQLUserInfo {
    id: string;
    name: string;
    picture: string;
}

/**
 * Validates RovoDev credentials and creates an AuthInfo object with user information and cloud ID.
 *
 * @param email - The user's email address
 * @param apiToken - The API token for authentication
 * @returns Promise that resolves to AuthInfo if validation succeeds
 * @throws Error with descriptive message if validation fails
 */
export async function createValidatedRovoDevAuthInfo(email: string, apiToken: string): Promise<RovoDevAuthInfo> {
    // Fetch user information (validates credentials implicitly)
    const userInfo = await fetchUserInfo(email, apiToken);

    // Create and return AuthInfo with validated information
    return {
        user: {
            id: userInfo.id,
            displayName: userInfo.name,
            email: email,
            avatarUrl: userInfo.picture,
        },
        state: AuthInfoState.Valid,
        username: email,
        password: apiToken,
    };
}

/**
 * Fetches user information from the GraphQL API using the provided credentials.
 * This is done mainly to validate that the credentials are correct.
 */
async function fetchUserInfo(email: string, apiToken: string): Promise<GraphQLUserInfo> {
    // Use api.atlassian.com as the endpoint for authentication
    // This works regardless of the user's specific site
    try {
        const response = await fetch(`https://api.atlassian.com/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
            },
            body: JSON.stringify({
                query: `query fetchUserInfo {
                    me {
                        user {
                            name,
                            id,
                            picture,
                        }
                    }
                }`,
            }),
        });

        if (!response.ok) {
            RovoDevLogger.error(
                new Error(`HTTP ${response.status}`),
                'Failed to validate credentials',
                response.statusText,
            );
            throw new Error(
                `Failed to authenticate with the provided credentials (HTTP ${response.status}). Please check your API token and try again.`,
            );
        }

        const data = await response.json();

        if (data.errors) {
            RovoDevLogger.error(
                new Error('GraphQL validation failed'),
                'GraphQL errors during validation',
                JSON.stringify(data.errors),
            );
            throw new Error('Failed to authenticate. Please check your API token and try again.');
        }

        if (!data.data?.me?.user) {
            RovoDevLogger.error(new Error('Invalid response structure'), 'No user data in response');
            throw new Error('Received invalid response from server. Please try again.');
        }

        return data.data.me.user;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('Failed to authenticate')) {
            throw error;
        }
        RovoDevLogger.error(error, 'Error validating RovoDev credentials');
        throw new Error('Network error occurred while validating credentials. Please check your connection.');
    }
}
