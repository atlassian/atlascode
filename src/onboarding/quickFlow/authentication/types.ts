import { Product } from 'src/atlclients/authInfo';

import { State } from '../types';
import { AuthFlowUI } from './authFlowUI';

export enum SpecialSiteOptions {
    NewSite = 'Log in to a new site...',
    OAuth = 'Login with OAuth to see available cloud sites',
}

export enum AuthenticationType {
    OAuth = 'OAuth',
    ApiToken = 'API Token',
    Server = 'Server',
}

export enum ServerCredentialType {
    Basic = 'Username & Password',
    PAT = 'Personal Access Token',
}

export enum SSLConfigurationType {
    Default = 'Default settings',
    CustomCA = 'Custom CA certificates',
    CustomClientSideCerts = 'Custom client-side certificates',
}

export type AuthFlowData = {
    // Product is assumed to be Jira, for now
    product: Product;

    skipAllowed: boolean;

    isNewSite: boolean;
    site: string;
    authenticationType: AuthenticationType;
    username: string;
    password: string;
    willOpenTokenManagementPage: boolean;

    // Server-specific stuff
    serverCredentialType: ServerCredentialType;
    personalAccessToken: string;
    isContextPathNeeded: boolean;
    contextPath: string;
    sslConfigurationType: SSLConfigurationType;
    sslCertsPath: string;
    pfxPath: string;
    pfxPassphrase: string;
};

export type PartialAuthData = Partial<AuthFlowData>;

export type AuthState = State<AuthFlowUI, PartialAuthData>;
