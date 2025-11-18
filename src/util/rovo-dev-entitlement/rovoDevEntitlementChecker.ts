import { rovoDevEntitlementCheckEvent } from 'src/analytics';
import { AnalyticsClient } from 'src/analytics-node-client/src/client.min';
import { ValidBasicAuthSiteData } from 'src/atlclients/clientManager';
import { Container } from 'src/container';
import { Logger } from 'src/logger';
import { Disposable } from 'vscode';

import { RovoDevEntitlementError, RovoDevEntitlementErrorType } from './rovoDevEntitlementError';

export enum EntitlementType {
    ROVO_DEV_EVERYWHERE = 'ROVO_DEV_EVERYWHERE',
    ROVO_DEV_STANDARD = 'ROVO_DEV_STANDARD',
    ROVO_DEV_STANDARD_TRIAL = 'ROVO_DEV_STANDARD_TRIAL',
    ROVO_DEV_BETA = 'ROVO_DEV_BETA',
}
interface EntitlementResponse {
    isEntitled: boolean;
    type: EntitlementType | RovoDevEntitlementErrorType;
}
export class RovoDevEntitlementChecker extends Disposable {
    private readonly _endpoint = `/gateway/api/rovodev/v3/sites/type`;
    private readonly _entitledResponse = [
        'ROVO_DEV_EVERYWHERE',
        'ROVO_DEV_STANDARD',
        'ROVO_DEV_STANDARD_TRIAL',
        'ROVO_DEV_BETA',
        // NO_ACTIVE_PRODUCT
    ];
    private _analyticsClient: AnalyticsClient;

    constructor(analyticsClient: AnalyticsClient) {
        super(() => {});
        this._analyticsClient = analyticsClient;
    }

    public async checkEntitlement(): Promise<EntitlementResponse> {
        try {
            const credentials = await Container.clientManager.getCloudPrimarySite();

            if (!credentials) {
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.CREDENTIAL_ERROR,
                    'No valid Rovo Dev credentials found',
                );
            }

            const options = {
                method: 'GET',
                headers: { ...this.createHeaders(credentials) },
            };

            const response = await fetch(`https://${credentials.host}${this._endpoint}`, options).catch((err) => {
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.FETCH_FAILED,
                    `Failed to fetch Rovo Dev entitlement: ${err.message}`,
                );
            });

            if (!response.ok) {
                const message = response.toString();
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.FETCH_FAILED,
                    `Failed to fetch Rovo Dev entitlement: ${message}`,
                    response.status,
                );
            }

            const value = await response.text();
            Logger.debug(`Entitlement response: ${value}`);

            if (!this._entitledResponse.includes(value.trim())) {
                throw new RovoDevEntitlementError(
                    RovoDevEntitlementErrorType.NO_ACTIVE_PRODUCT,
                    'No active Rovo Dev product found for the provided credentials',
                );
            }

            rovoDevEntitlementCheckEvent(true, value).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });

            return {
                isEntitled: true,
                type: value.trim() as EntitlementType,
            };
        } catch (err) {
            Logger.error(err, 'Unable to check Rovo Dev entitlement');
            const errType: string =
                err instanceof RovoDevEntitlementError ? err.errorType : RovoDevEntitlementErrorType.UNKOWN_ERROR;
            let errTypeFinal = errType;
            if (errType === RovoDevEntitlementErrorType.FETCH_FAILED && err.statusCode) {
                errTypeFinal = `${errType}_${err.statusCode}`;
            }

            rovoDevEntitlementCheckEvent(false, errTypeFinal).then((e) => {
                this._analyticsClient.sendTrackEvent(e);
            });

            return {
                isEntitled: false,
                type: errType as RovoDevEntitlementErrorType,
            };
        }
    }

    private createHeaders(cred: ValidBasicAuthSiteData): Record<string, string> {
        const headers: Record<string, string> = {};

        const authInfo = cred.authInfo;
        const encodedAuth = Buffer.from(`${authInfo.username}:${authInfo.password}`).toString('base64');

        headers['Authorization'] = `Basic ${encodedAuth}`;

        headers['X-RovoDev-Billing-CloudId'] = cred.siteCloudId;

        return headers;
    }
}
