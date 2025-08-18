import { AxiosInstance } from 'axios';

import { Logger } from '../../logger';
import { AccessibleResource, UserInfo } from '../authInfo';
import { Strategy } from '../strategy';
import { Tokens } from '../tokens';
import { ResponseHandler } from './ResponseHandler';

export class JiraPKCEResponseHandler extends ResponseHandler {
    constructor(
        private strategy: Strategy,
        private agent: { [k: string]: any },
        private axios: AxiosInstance,
    ) {
        super();
    }

    async tokens(code: string): Promise<Tokens> {
        try {
            const tokenResponse = await this.axios(this.strategy.tokenUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: this.strategy.tokenAuthorizationData(code),
                ...this.agent,
            });

            const data = tokenResponse.data;
            return { accessToken: data.access_token, refreshToken: data.refresh_token, receivedAt: Date.now() };
        } catch (err) {
            Logger.error(err, 'Error fetching Jira tokens');
            const data = err?.response?.data;
            const newErr = new Error(`Error fetching Jira tokens: ${err}
            
            Response: ${JSON.stringify(data ?? {})}`);
            throw newErr;
        }
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
                avatarUrl: data.avatarUrls['48x48'],
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
