import { UiAction } from '../../baseUI';
import { Transition } from '../../types';
import { AuthFlowUI } from '../authFlowUI';
import { AuthState, PartialAuthData, ServerCredentialType, SSLConfigurationType } from '../types';
import { CommonAuthStates } from './common';
import { TerminalAuthStates } from './terminal';

export class ServerAuthStates {
    public static chooseServerAuthType: AuthState = {
        name: 'chooseServerAuthType',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [ServerCredentialType.Basic]: CommonAuthStates.inputUsername,
                [ServerCredentialType.PAT]: ServerAuthStates.inputPAT,
            };

            if (data.skipAllowed && data.serverCredentialType !== undefined) {
                return Transition.forward(transitions[data.serverCredentialType]);
            }

            const { value, action } = await ui.pickServerCredentialType(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(transitions[value as ServerCredentialType], {
                serverCredentialType: value as ServerCredentialType,
            });
        },
    };

    public static inputPAT: AuthState = {
        name: 'inputPAT',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.personalAccessToken !== undefined) {
                return Transition.forward(ServerAuthStates.showContextPathPrompt);
            }

            const { value, action } = await ui.inputPassword(data, 'Personal Access Token');
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(ServerAuthStates.showContextPathPrompt, { personalAccessToken: value });
        },
    };

    public static showContextPathPrompt: AuthState = {
        name: 'showContextPathPrompt',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.isContextPathNeeded !== undefined) {
                return Transition.forward(ServerAuthStates.inputContextPath);
            }

            const { value, action } = await ui.pickContextPathNeeded(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            const isNeeded = value === 'Yes';
            return Transition.forward(
                isNeeded ? ServerAuthStates.inputContextPath : ServerAuthStates.chooseSslConfigurationType,
                {
                    isContextPathNeeded: isNeeded,
                },
            );
        },
    };

    public static inputContextPath: AuthState = {
        name: 'inputContextPath',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.contextPath !== undefined) {
                return Transition.forward(ServerAuthStates.chooseSslConfigurationType);
            }

            const { value, action } = await ui.inputContextPath(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(ServerAuthStates.chooseSslConfigurationType, { contextPath: value });
        },
    };

    public static chooseSslConfigurationType: AuthState = {
        name: 'chooseSslConfigurationType',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [SSLConfigurationType.Default]: TerminalAuthStates.finishServerAuth,
                [SSLConfigurationType.CustomCA]: ServerAuthStates.inputSslCertsPath,
                [SSLConfigurationType.CustomClientSideCerts]: ServerAuthStates.inputPfxPath,
            };

            if (data.skipAllowed && data.sslConfigurationType !== undefined) {
                return Transition.forward(transitions[data.sslConfigurationType]);
            }

            const { value, action } = await ui.pickSslConfigurationType(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(transitions[value as SSLConfigurationType], {
                sslConfigurationType: value as SSLConfigurationType,
            });
        },
    };

    public static inputSslCertsPath: AuthState = {
        name: 'inputSslCertsPath',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.sslCertsPath !== undefined) {
                return Transition.forward(TerminalAuthStates.finishServerAuth);
            }

            const { value, action } = await ui.inputSslCertsPath(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(TerminalAuthStates.finishServerAuth, { sslCertsPath: value });
        },
    };

    public static inputPfxPath: AuthState = {
        name: 'inputPfxPath',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.pfxPath !== undefined) {
                return Transition.forward(ServerAuthStates.inputPfxPassphrase);
            }

            const { value, action } = await ui.inputPfxPath(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(ServerAuthStates.inputPfxPassphrase, { pfxPath: value });
        },
    };

    public static inputPfxPassphrase: AuthState = {
        name: 'inputPfxPassphrase',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.pfxPassphrase !== undefined) {
                return Transition.forward(TerminalAuthStates.finishServerAuth);
            }

            const { value, action } = await ui.inputPfxPassphrase(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(TerminalAuthStates.finishServerAuth, { pfxPassphrase: value });
        },
    };
}
