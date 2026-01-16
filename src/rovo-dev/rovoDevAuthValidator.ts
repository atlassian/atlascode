import { AuthInfoState } from 'src/atlclients/authInfo';

import { RovoDevLogger } from './util/rovoDevLogger';

export interface RovoDevAuthInfo {
    user: {
        id: string;
        displayName: string;
        email: string;
        avatarUrl: string;
    };
    state: number; // AuthInfoState.Valid = 0
    username: string;
    password: string;
    host: string;
    cloudId: string;
}

interface GraphQLUserInfo {
    id: string;
    name: string;
    picture: string;
}

/**
 * Validates RovoDev credentials and creates an AuthInfo object with user information and cloud ID.
 *
 * @param host - The Atlassian Cloud host (with or without protocol/trailing slashes)
 * @param email - The user's email address
 * @param apiToken - The API token for authentication
 * @returns Promise that resolves to AuthInfo if validation succeeds
 * @throws Error with descriptive message if validation fails
 */
export async function createValidatedRovoDevAuthInfo(
    host: string,
    email: string,
    apiToken: string,
): Promise<RovoDevAuthInfo> {
    // Normalize host to remove protocol and trailing slashes
    const normalizedHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Validate that it's an atlassian.net domain
    if (!normalizedHost.endsWith('.atlassian.net')) {
        throw new Error('Please enter a valid Atlassian Cloud site (*.atlassian.net)');
    }

    // Validate credentials and fetch user information
    const userInfo = await validateCredentialsAndFetchUser(normalizedHost, email, apiToken);

    // Fetch cloud ID for the site
    const cloudId = await fetchCloudId(normalizedHost);

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
        host: normalizedHost,
        cloudId: cloudId,
    };
}

/**
 * Validates credentials by calling the GraphQL API and returns user information.
 */
async function validateCredentialsAndFetchUser(
    host: string,
    email: string,
    apiToken: string,
): Promise<GraphQLUserInfo> {
    try {
        const response = await fetch(`https://${host}/gateway/api/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
            },
            body: JSON.stringify({
                query: `query test {
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

/**
 * Fetches the cloud ID for the given Atlassian Cloud host.
 */
async function fetchCloudId(host: string): Promise<string> {
    try {
        const response = await fetch(`https://${host}/_edge/tenant_info`);
        if (!response.ok) {
            RovoDevLogger.error(new Error(`HTTP ${response.status}`), 'Failed to fetch cloud ID');
            throw new Error('Failed to retrieve site information. Please try again.');
        }
        const data = await response.json();
        if (!data.cloudId) {
            throw new Error('Site information does not contain cloud ID.');
        }
        return data.cloudId;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Site information')) {
            throw error;
        }
        RovoDevLogger.error(error, 'Error fetching cloud ID');
        throw new Error('Failed to retrieve site information. Please check your connection and try again.');
    }
}
