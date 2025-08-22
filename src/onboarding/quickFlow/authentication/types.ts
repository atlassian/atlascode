import { Product } from 'src/atlclients/authInfo';

export enum AuthType {
    OAuth = 'OAuth',
    ApiToken = 'API Token',
    Server = 'Server',
}

export type AuthFlowData = {
    // Product is assumed to be Jira, for now
    product: Product;

    skipAllowed: boolean;

    isNewSite: boolean;
    site: string;
    authenticationType: AuthType;
    username: string;
    password: string;
    willOpenTokenManagementPage: boolean;
};
