export interface RovoDevChatRequestContextFileEntry {
    type: 'file';
    file_path: string;
    selection?: {
        start: number;
        end: number;
    };
    note?: string;
}

export interface RovoDevChatRequestContextOtherEntry {
    type: Exclude<string, 'file'>;
    content: string;
}

export interface RovoDevChatRequest {
    message: string;
    context: (RovoDevChatRequestContextFileEntry | RovoDevChatRequestContextOtherEntry)[];
    enable_deep_plan?: boolean;
}

export interface BaicRovoDevHealthcheckResponse {
    status: 'unknown' | 'healthy' | 'unhealthy' | 'pending user review';
    version: string;
    mcp_servers: Record<string, string> | null;
    sessionId: string | null; // from response header
}

export type EntitlementFailedStatus =
    | 'PRODUCT_NOT_INSTALLED'
    | 'USER_NOT_AUTHORIZED'
    | 'USER_NOT_AUTHORIZED_FOR_AI'
    | 'BETA_AI_FEATURES_DISABLED'
    | 'FEATURE_DISABLED_ORG_LEVEL'
    | 'FEATURE_DISABLED_SITE_LEVEL'
    | 'FEATURE_DISABLED_WORKSPACE_LEVEL'
    | 'FEATURE_DISABLED_REPOSITORY_LEVEL'
    | 'FEATURE_DISABLED_PAID_ONLY';

export interface EntitlementCheckRovoDevHealthcheckResponse {
    status: 'entitlement check failed';
    version: string;
    detail: {
        title: string;
        message: string;
        payload: {
            status: EntitlementFailedStatus;
            message: string;
            userCreditLimits: {
                user: {
                    isProductAdmin: boolean;
                    isOrgAdmin: boolean;
                };
            };
        };
    };
    mcp_servers: null;
    sessionId: string | null; // from response header
}

export type RovoDevHealthcheckResponse = BaicRovoDevHealthcheckResponse | EntitlementCheckRovoDevHealthcheckResponse;

export interface RovoDevCancelResponse {
    message: string;
    cancelled: boolean;
}

export type ToolPermissionChoice = 'allow' | 'deny';
