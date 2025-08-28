import { UiAction } from '../../baseUI';
import { Transition } from '../../types';
import { AuthFlowUI } from '../authFlowUI';
import { AuthenticationType, AuthState, PartialAuthData } from '../types';
import { ServerAuthStates } from './server';
import { TerminalAuthStates } from './terminal';

export class CommonAuthStates {
    public static initialState: AuthState = {
        name: 'initial',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            return Transition.forward(CommonAuthStates.selectAuthType);
        },
    };

    public static selectAuthType: AuthState = {
        name: 'selectAuthType',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [AuthenticationType.OAuth]: TerminalAuthStates.runOauth,
                [AuthenticationType.ApiToken]: CommonAuthStates.selectSiteFromDropdown,
                [AuthenticationType.Server]: CommonAuthStates.selectSiteFromDropdown,
            };

            if (data.skipAllowed && data.authenticationType !== undefined) {
                return Transition.forward(transitions[data.authenticationType]);
            }

            const { value, action } = await ui.pickAuthenticationType(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            const targetStep = transitions[value as AuthenticationType];
            if (!targetStep) {
                throw new Error(`Unknown authentication type: ${value}`);
            }

            return Transition.forward(targetStep, { authenticationType: value as AuthenticationType });
        },
    };

    public static selectSiteFromDropdown: AuthState = {
        name: 'selectSiteFromDropdown',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [AuthenticationType.OAuth]: CommonAuthStates.inputUsername,
                [AuthenticationType.ApiToken]: CommonAuthStates.inputUsername,
                [AuthenticationType.Server]: ServerAuthStates.chooseServerAuthType,
            };

            if (data.skipAllowed && data.site !== undefined) {
                return Transition.forward(transitions[data.authenticationType!]);
            }

            const { value, action } = await ui.pickSite(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'Log in to a new site...') {
                return Transition.forward(CommonAuthStates.inputNewSite, { isNewSite: true });
            }
            return Transition.forward(transitions[data.authenticationType!], { site: value });
        },
    };

    public static inputNewSite: AuthState = {
        name: 'inputNewSite',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [AuthenticationType.OAuth]: CommonAuthStates.inputUsername,
                [AuthenticationType.ApiToken]: CommonAuthStates.inputUsername,
                [AuthenticationType.Server]: ServerAuthStates.chooseServerAuthType,
            };

            const { value, action } = await ui.inputNewSite(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(transitions[data.authenticationType!], { site: value, isNewSite: true });
        },
    };

    public static inputUsername: AuthState = {
        name: 'inputUsername',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const nextStep =
                data.authenticationType !== AuthenticationType.Server
                    ? CommonAuthStates.showCreateTokenPrompt
                    : CommonAuthStates.inputPassword;

            if (data.skipAllowed && data.username !== undefined) {
                return Transition.forward(nextStep);
            }

            const { value, action } = await ui.inputUsername(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(nextStep, { username: value });
        },
    };

    public static showCreateTokenPrompt: AuthState = {
        name: 'showCreateTokenPrompt',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            if (data.skipAllowed && data.willOpenTokenManagementPage === false) {
                // Only skip this step if we are explicitly told not to open the page
                return Transition.forward(CommonAuthStates.inputPassword);
            }

            const { value, action } = await ui.pickCreateTokenNeeded(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'Yes') {
                ui.openApiManagementPage();
            }

            return Transition.forward(CommonAuthStates.inputPassword, { willOpenTokenManagementPage: value === 'Yes' });
        },
    };

    public static inputPassword: AuthState = {
        name: 'inputPassword',
        action: async (data: PartialAuthData, ui: AuthFlowUI) => {
            const transitions = {
                [AuthenticationType.ApiToken]: TerminalAuthStates.addAPIToken,
                [AuthenticationType.Server]: ServerAuthStates.showContextPathPrompt,
                // Should be unreachable
                [AuthenticationType.OAuth]: TerminalAuthStates.runOauth,
            };

            if (data.skipAllowed && data.password !== undefined) {
                return Transition.forward(transitions[data.authenticationType!]);
            }

            const passwordType = data.authenticationType === AuthenticationType.ApiToken ? 'API Token' : 'Password';
            const { value, action } = await ui.inputPassword(data, passwordType);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(transitions[data.authenticationType!], { password: value });
        },
    };
}
