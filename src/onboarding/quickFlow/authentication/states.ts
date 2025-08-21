import { BasicAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { SETTINGS_URL } from 'src/uriHandler';
import { window } from 'vscode';

import { UiAction } from '../baseUI';
import { State, Transition } from '../types';
import { AuthFlowData, AuthType } from './types';
import { UI } from './ui';

type PartialAuthData = Partial<AuthFlowData>;
export type AuthState = State<UI, PartialAuthData>;

export class States {
    initial: AuthState = {
        name: 'initial',
        action: async (data: PartialAuthData, ui: UI) => {
            return Transition.forward(this.authType);
        },
    };

    authType: AuthState = {
        name: 'authType',
        action: async (data: PartialAuthData, ui: UI) => {
            const transitions = {
                [AuthType.OAuth]: this.runOauth,
                [AuthType.ApiToken]: this.siteSelector,
                [AuthType.Server]: this.siteSelector,
            };

            if (data.skipAllowed && data.authenticationType !== undefined) {
                return Transition.forward(transitions[data.authenticationType]);
            }

            const { value, action } = await ui.authenticationTypeInput(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            const targetStep = transitions[value as AuthType];
            if (!targetStep) {
                throw new Error(`Unknown authentication type: ${value}`);
            }

            return Transition.forward(targetStep, { authenticationType: value as AuthType });
        },
    };

    siteSelector: AuthState = {
        name: 'siteSelector',
        action: async (data: PartialAuthData, ui: UI) => {
            if (data.skipAllowed && data.site !== undefined) {
                return Transition.forward(this.username);
            }

            const { value, action } = await ui.sitePicker(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'Log in to a new site...') {
                return Transition.forward(this.newSite, { isNewSite: true });
            }
            return Transition.forward(this.username, { site: value });
        },
    };

    newSite: AuthState = {
        name: 'newSite',
        action: async (data: PartialAuthData, ui: UI) => {
            const { value, action } = await ui.newSiteInput(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(this.username, { site: value, isNewSite: true });
        },
    };

    username: AuthState = {
        name: 'username',
        action: async (data: PartialAuthData, ui: UI) => {
            const nextStep = data.authenticationType !== AuthType.Server ? this.createTokenPrompt : this.password;

            if (data.skipAllowed && data.username !== undefined) {
                return Transition.forward(nextStep);
            }

            const { value, action } = await ui.usernameInput(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(nextStep, { username: value });
        },
    };

    createTokenPrompt: AuthState = {
        name: 'createTokenPrompt',
        action: async (data: PartialAuthData, ui: UI) => {
            if (data.skipAllowed && data.willOpenTokenManagementPage === false) {
                // Only skip this step if we are explicitly told not to open the page
                return Transition.forward(this.password);
            }

            const { value, action } = await ui.createTokenPrompt(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'Yes') {
                ui.openApiManagementPage();
            }

            return Transition.forward(this.password, { willOpenTokenManagementPage: value === 'Yes' });
        },
    };

    password: AuthState = {
        name: 'password',
        action: async (data: PartialAuthData, ui: UI) => {
            const targetState = data.authenticationType === AuthType.ApiToken ? this.addAPIToken : this.done;

            if (data.skipAllowed && data.password !== undefined) {
                return Transition.forward(targetState);
            }

            const { value, action } = await ui.passwordInput(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(targetState, { password: value });
        },
    };

    // Terminal states:
    runOauth: AuthState = {
        name: 'runOauth',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: UI) => {
            if (!data.authenticationType || data.authenticationType !== AuthType.OAuth) {
                throw new Error('Authentication type must be OAuth to run OAuth flow');
            }

            await Container.loginManager.userInitiatedOAuthLogin(
                { host: 'atlassian.net', product: ProductJira },
                SETTINGS_URL,
            );
            return Transition.done();
        },
    };

    addAPIToken: AuthState = {
        name: 'addAPIToken',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: UI) => {
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

    done: AuthState = {
        name: 'done',
        isTerminal: true,
        action: async (data: PartialAuthData, ui: UI) => {
            // Placeholder state
            window.showInformationMessage(`Authentication complete: ${JSON.stringify(data)}`);
            return Transition.done();
        },
    };
}
