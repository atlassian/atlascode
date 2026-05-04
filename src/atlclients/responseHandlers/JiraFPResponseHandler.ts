import { AxiosInstance } from 'axios';
import { Time } from 'src/util/time';

import { Logger } from '../../logger';
import { AccessibleResource, UserInfo } from '../authInfo';
import { Strategy } from '../strategy';
import { Tokens } from '../tokens';
import { ResponseHandler } from './ResponseHandler';

export class JiraFPResponseHandler extends ResponseHandler {
    private interval: number | undefined;
    private intervalId: NodeJS.Timeout | undefined;
    constructor(
        private strategy: Strategy,
        private agent: { [k: string]: any },
        private axios: AxiosInstance,
    ) {
        super();
    }

    override setIntervalPeriod(interval: number) {
        this.interval = interval;
    }

    override clearCurrentInterval() {
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = undefined;
        }
    }

    async tokens(code: string): Promise<Tokens> {
        if (!this.interval) {
            throw new Error('Polling interval not set for JiraFPResponseHandler');
        }
        let pollingIntervalMs = this.interval * Time.SECONDS;
        const pollForToken = async (): Promise<any> => {
            try {
                const res = await this.axios.post(this.strategy.tokenUrl(), this.strategy.tokenAuthorizationData(code));
                if (res.status === 200) {
                    this.clearCurrentInterval();
                    const data = res.data;
                    return {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        receivedAt: Date.now(),
                        scopes: data.scope ? data.scope.split(' ') : [],
                    };
                }
            } catch (error: any) {
                if (error.status === 400 || error?.response?.status === 400) {
                    const responseDataError = error?.response?.data?.error;
                    // This endpoint returns 400 with { error: "authorization_pending", ... } until the user authenticates.
                    // So we need to check the error response to know whether to keep polling or to throw an error.
                    if (responseDataError === 'authorization_pending') {
                        await new Promise<void>((resolveTimeout) => {
                            this.intervalId = setTimeout(() => resolveTimeout(), pollingIntervalMs);
                        });
                        return pollForToken();
                    } else if (responseDataError === 'slow_down') {
                        // Increase polling interval, wait, then retry.
                        pollingIntervalMs += this.interval || 5 * Time.SECONDS;
                        await new Promise<void>((resolveTimeout) => {
                            this.intervalId = setTimeout(() => resolveTimeout(), pollingIntervalMs);
                        });
                        return pollForToken();
                    } else {
                        this.clearCurrentInterval();
                        throw new Error(`Error during device auth flow: ${error.message}`);
                    }
                } else {
                    this.clearCurrentInterval();
                    throw new Error(`Error during device auth flow: ${error.message}`);
                }
            }
        };

        // Start the initial poll. Subsequent polls will be scheduled recursively based on the server response.
        const tokens = await pollForToken();
        return tokens;
    }

    async user(accessToken: string, resource: AccessibleResource): Promise<UserInfo> {
        try {
            const apiUri = this.strategy.apiUrl();
            const url = `https://${apiUri}/ex/jira/${resource.id}/rest/api/2/myself`;

            const userResponse = await this.axios(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...this.agent,
            });

            const data = userResponse.data;

            return {
                id: data.accountId,
                displayName: data.displayName,
                email: data.emailAddress,
                avatarUrl: data.avatarUrls?.['48x48'] || '',
            };
        } catch (err) {
            Logger.error(err, 'Error fetching Jira user');
            throw new Error(`Error fetching Jira user: ${err}`);
        }
    }

    public async accessibleResources(accessToken: string): Promise<AccessibleResource[]> {
        try {
            const resourcesResponse = await this.axios(this.strategy.accessibleResourcesUrl(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...this.agent,
            });

            return resourcesResponse.data;
        } catch (err) {
            Logger.error(err, 'Error fetching Jira resources');
            throw new Error(`Error fetching Jira resources: ${err}`);
        }
    }
}
