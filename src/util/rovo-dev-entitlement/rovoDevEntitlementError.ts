export enum RovoDevEntitlementErrorType {
    CREDENTIAL_ERROR = 'CREDENTIAL_ERROR',
    FETCH_FAILED = 'FETCH_FAILED',
    NO_ACTIVE_PRODUCT = 'NO_ACTIVE_PRODUCT',
    UNKOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RovoDevEntitlementError extends Error {
    public readonly statusCode?: number;
    public readonly errorType: RovoDevEntitlementErrorType;
    constructor(errorType: RovoDevEntitlementErrorType, message: string, statusCode?: number) {
        super(message);
        this.name = 'RovoDevEntitlementError';

        this.errorType = errorType;
        this.statusCode = statusCode;
    }
}
