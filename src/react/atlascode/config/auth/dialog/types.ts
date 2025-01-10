export type FormFields = {
    baseUrl: string;
    contextPathEnabled: boolean;
    customSSLType: string;
    contextPath: string;
    username: string;
    password: string;
    personalAccessToken: string;
    customSSLEnabled: boolean;
    sslCertPaths: string;
    pfxPath: string;
    pfxPassphrase: string;
};

export interface AuthFormState {
    showPassword: boolean;
    showPFXPassphrase: boolean;
}

export const emptyAuthFormState: AuthFormState = {
    showPassword: false,
    showPFXPassphrase: false,
};
