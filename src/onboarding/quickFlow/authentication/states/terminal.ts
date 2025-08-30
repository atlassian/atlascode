import { BasicAuthInfo, PATAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { window } from 'vscode';

import { Transition } from '../../types';
import { AuthFlowUI } from '../authFlowUI';
import { AuthState, PartialAuthData, ServerCredentialType } from '../types';

export class TerminalAuthStates {
    public static addAPIToken: AuthState = {
        name: 'addAPIToken',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (!data.site || !data.username || !data.password) {
                throw new Error('Missing required fields for API Token authentication');
            }

            try {
                await Container.loginManager.userInitiatedServerLogin(
                    {
                        host: data.site,
                        product: ProductJira,
                    },
                    {
                        username: data.username,
                        password: data.password,
                    } as BasicAuthInfo,
                );

                return Transition.forward(TerminalAuthStates.authSuccess);
            } catch (err) {
                return Transition.forward(TerminalAuthStates.authFailure, { error: err.message || err });
            }
        },
    };

    public static finishServerAuth: AuthState = {
        name: 'serverAuth',
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

            try {
                await Container.loginManager.userInitiatedServerLogin(
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

                return Transition.forward(TerminalAuthStates.authSuccess);
            } catch (err) {
                return Transition.forward(TerminalAuthStates.authFailure, { error: err.message || err });
            }
        },
    };

    public static authFailure: AuthState = {
        name: 'authFailure',
        isTerminal: true,
        isFailure: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            window.showErrorMessage(data.error ? `Authentication failed: ${data.error}` : 'Authentication failed');
            return Transition.done();
        },
    };

    public static authSuccess: AuthState = {
        name: 'authSuccess',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            window.showInformationMessage('Authentication successful!');
            return Transition.done();
        },
    };
}
