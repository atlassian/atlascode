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

export type RovoDevChatRequestContext = RovoDevChatRequestContextFileEntry | RovoDevChatRequestContextOtherEntry;

export interface RovoDevChatRequest {
    message: string;
    context: RovoDevChatRequestContext[];
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
        payload: {
            status: EntitlementFailedStatus;
            title?: string;
            message: string;
            ctaLink?: {
                link: string;
                text: string;
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

export interface RovoDevStatusAPIResponse {
    cliVersion: { version: string; sessionId: string };
    workingDirectory: string;
    account: {
        email: string;
        accountId: string;
        orgId: string;
        isServerAvailable: boolean;
    };
    memory: { memoryPaths: string[]; hasMemoryFiles: boolean; errorMessage: string | null };
    model: { modelName: string; humanReadableName: string; errorMessage: string | null };
}

export type ToolPermissionChoice = 'allow' | 'deny';

export type AgentMode = 'ask' | 'default' | 'plan';

export interface RovoDevGetAgentModeResponse {
    mode: AgentMode;
    message: string;
}

export interface RovoDevSetAgentModeRequest {
    mode: AgentMode;
}

export interface RovoDevSetAgentModeResponse {
    mode: AgentMode;
    message: string;
}

export interface RovoDevModeInfo {
    mode: string; // Use string to allow new modes to be added on Rovo Dev side
    description: string;
}

export interface RovoDevAvailableModesResponse {
    modes: RovoDevModeInfo[];
}

export interface RovoDevSavedPromptsResponse {
    prompts: {
        name: string;
        description: string;
        content_file: string;
    }[];
}

export interface RovoDevGetAgentModelResponse {
    model_name: string;
    model_id: string;
    credit_multiplier: string;
    message: string;
}

export interface RovoDevSetAgentModelRequest {
    model_id: string;
}

export interface RovoDevSetAgentModelResponse {
    model_name: string;
    model_id: string;
    message: string;
}

export interface RovoDevGetAvailableAgentModelsResponse {
    models: {
        name: string;
        model_id: string;
        description: string;
        credit_multiplier: string;
    }[];
}
