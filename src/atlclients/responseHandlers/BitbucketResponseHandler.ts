import { AccessibleResource, UserInfo } from '../authInfo';

import { AxiosInstance } from 'axios';
import { Logger } from '../../logger';
import { ProductBitbucket } from '../authInfo';
import { ResponseHandler } from './ResponseHandler';
import { Strategy } from '../strategy';
import { Tokens } from '../tokens';

export class BitbucketResponseHandler extends ResponseHandler {
    constructor(
        private strategy: Strategy,
        private agent: { [k: string]: any },
        private axios: AxiosInstance,
    ) {
        super();
    }

    public async tokens(code: string): Promise<Tokens> {
        try {
            const tokenResponse = await this.axios(this.strategy.tokenUrl(), {
                method: 'POST',
                headers: this.strategy.refreshHeaders(), // either we should have a separate authHeaders method or refreshHeaders should be renamed
                data: this.strategy.tokenAuthorizationData(code),
                ...this.agent,
            });

            const data = tokenResponse.data;
            return { accessToken: data.access_token, refreshToken: data.refresh_token, receivedAt: Date.now() };
        } catch (err) {
            const newErr = new Error(`Error fetching Bitbucket tokens: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }

    public async user(accessToken: string, resource: AccessibleResource): Promise<UserInfo> {
        try {
            const userResponse = await this.axios(this.strategy.profileUrl(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...this.agent,
            });

            let email = 'do-not-reply@atlassian.com';
            try {
                const emailsResponse = await this.axios(this.strategy.emailsUrl(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    ...this.agent,
                });

                if (Array.isArray(emailsResponse.data.values) && emailsResponse.data.values.length > 0) {
                    const primary = emailsResponse.data.values.filter((val: any) => val.is_primary);
                    if (primary.length > 0) {
                        email = primary[0].email;
                    }
                }
            } catch {
                //ignore
            }

            const userData = userResponse.data;

            return {
                id: userData.account_id,
                displayName: userData.display_name,
                email: email,
                avatarUrl: userData.links.avatar.href,
            };
        } catch (err) {
            const newErr = new Error(`Error fetching Bitbucket user: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }

    public accessibleResources(accessToken: string): Promise<AccessibleResource[]> {
        return Promise.resolve([
            {
                id: this.strategy.provider(),
                name: ProductBitbucket.name,
                scopes: [],
                avatarUrl: '',
                url: this.strategy.apiUrl(),
            },
        ]);
    }
}
