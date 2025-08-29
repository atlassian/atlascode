import { BasicAuthInfo, PATAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { window } from 'vscode';

import { Transition } from '../../types';
import { AuthFlowUI } from '../authFlowUI';
import { AuthState, PartialAuthData, ServerCredentialType } from '../types';

export class TerminalAuthStates {
    public static addAPIToken: AuthState = {
        name: 'addAPIToken',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (!data.site || !data.username || !data.password) {
                throw new Error('Missing required fields for API Token authentication');
            }

            Container.loginManager.userInitiatedServerLogin(
                {
                    host: data.site,
                    product: ProductJira,
                },
                {
                    username: data.username,
                    password: data.password,
                } as BasicAuthInfo,
            );

            return Transition.done();
        },
    };

    public static finishServerAuth: AuthState = {
        name: 'serverAuth',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (!data.site) {
                throw new Error('Missing required fields for Server authentication');
            }

            const authInfo =
                data.serverCredentialType === ServerCredentialType.PAT
                    ? ({
                          token: data.personalAccessToken,
                      } as PATAuthInfo)
                    : ({
                          username: data.username,
                          password: data.password,
                      } as BasicAuthInfo);

            Container.loginManager.userInitiatedServerLogin(
                {
                    host: data.site,
                    product: ProductJira,
                    contextPath: data.contextPath,
                    customSSLCertPaths: data.sslCertsPath,
                    pfxPath: data.pfxPath,
                    pfxPassphrase: data.pfxPassphrase,
                },
                authInfo,
            );

            return Transition.done();
        },
    };

    public static oauthFailure: AuthState = {
        name: 'oauthFailure',
        isTerminal: true,
        isFailure: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            window.showErrorMessage('OAuth authentication failed');
            return Transition.done();
        },
    };

    public static oauthSuccess: AuthState = {
        name: 'oauthSuccess',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            // No action needed
            return Transition.done();
        },
    };
}
