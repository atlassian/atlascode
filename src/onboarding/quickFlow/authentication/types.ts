export enum AuthType {
    OAuth = 'OAuth',
    ApiToken = 'API Token',
    Server = 'Server',
}

export type AuthFlowData = {
    // Product is assumed to be Jira, for now
    skipAllowed: boolean;

    isNewSite: boolean;
    site: string;
    authenticationType: AuthType;
    username: string;
    password: string;
    willOpenTokenManagementPage: boolean;
};
