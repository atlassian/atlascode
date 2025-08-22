import { BasicAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import {
    env,
    InputBoxOptions,
    InputBoxValidationSeverity,
    QuickInputButton,
    QuickInputButtons,
    QuickPickItem,
    QuickPickItemKind,
    ThemeIcon,
    Uri,
} from 'vscode';

import { BaseUI, UiResponse } from '../baseUI';
import { AuthFlowData, AuthType } from './types';

export type ExtraOptions = {
    step?: number;
    totalSteps?: number;
    buttons?: QuickInputButton[];
    buttonHandler?: (e: QuickInputButton) => void;
    value?: string;
    prompt?: string;
};

type PartialData = Partial<AuthFlowData>;

export class UI {
    constructor(private readonly baseUI: BaseUI) {}

    public newSiteInput(state: PartialData): Promise<UiResponse> {
        const defaults: Partial<InputBoxOptions> = {
            value: state.site || '',
            valueSelection: state.site ? [0, state.site.length] : undefined,
        };

        if (state.authenticationType !== AuthType.Server) {
            // We expect an `atlassian.net` hostname
            defaults.value = defaults.value || 'your-site.atlassian.net';
            defaults.valueSelection = [0, defaults.value.indexOf('.atlassian.net')];
            defaults.validateInput = (value) => {
                const isValid = /^[a-z0-9]+([-.][a-z0-9]+)*\.atlassian\.net$/.test(value);
                return isValid
                    ? null
                    : 'Cloud sites typically look like `your-site.atlassian.net`. Do you have a Jira Server instance?';
            };
        } else {
            // Not an .atlassian.net domain
            defaults.validateInput = (value) => {
                const isCloud = /^[a-z0-9]+([-.][a-z0-9]+)*\.atlassian\.net$/.test(value);
                return !isCloud ? null : 'This looks like a cloud site. Do you have a Jira Cloud instance?';
            };
        }

        return this.baseUI.showInputBox({
            title: 'Quick Auth',
            placeHolder: 'Enter your new site name',
            buttons: [QuickInputButtons.Back],
            ...defaults,
        });
    }

    public sitePicker(state: PartialData): Promise<UiResponse> {
        const sites: QuickPickItem[] = Container.siteManager
            .getSitesAvailable(ProductJira)
            .filter((site) => site.isCloud === (state.authenticationType !== AuthType.Server))
            .map((site) => ({
                label: site.host,
                iconPath: site.isCloud ? new ThemeIcon('cloud') : new ThemeIcon('server'),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        if (sites.length === 0 && state.authenticationType === AuthType.ApiToken) {
            sites.push({
                label: 'Login with OAuth to see available cloud sites',
                detail: 'Oops, not implemented yet! Run OAuth from the previous step to see sites here',
                iconPath: new ThemeIcon('info'),
            });
        }
        const choices = [
            {
                label: 'Log in to a new site...',
                iconPath: new ThemeIcon('add'),
            },
            {
                label: '',
                kind: QuickPickItemKind.Separator,
            },
            ...sites,
        ];
        return this.baseUI.showQuickPick(choices, {
            title: 'Select Site',
            buttons: [QuickInputButtons.Back],
        });
    }

    public authenticationTypeInput(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showQuickPick(
            [
                {
                    iconPath: new ThemeIcon('cloud'),
                    label: AuthType.OAuth,
                    description: 'Authenticate using OAuth',
                    detail: 'Get basic access to your Atlassian work items',
                },
                {
                    iconPath: new ThemeIcon('key'),
                    label: AuthType.ApiToken,
                    description: 'Authenticate via an API token',
                    detail: 'Get the full power of Atlassian integration, including experimental and AI features',
                },
                {
                    iconPath: new ThemeIcon('server'),
                    label: AuthType.Server,
                    description: 'Authenticate with Jira Server or Datacenter',
                    detail: 'Use this if you have a self-hosted Jira instance or Jira DC',
                },
            ],
            {
                title: 'Select Authentication Type',
                value: state.authenticationType || '',
                buttons: [QuickInputButtons.Back],
            },
        );
    }

    private async getDefaultUsername(state: PartialData): Promise<string> {
        if (state.authenticationType !== AuthType.ApiToken) {
            return '';
        }

        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        const site = sites.find((s) => s.host === state.site);
        if (!site) {
            return '';
        }

        const credentials = await Container.credentialManager.getAuthInfo(site);
        if (!credentials) {
            return '';
        }

        return credentials.user.email;
    }

    public async usernameInput(state: PartialData): Promise<UiResponse> {
        const inferredUsername = await this.getDefaultUsername(state);
        const defaultUsername = state.username || inferredUsername;

        const credName = state.authenticationType === AuthType.ApiToken ? 'email address' : 'username';

        return this.baseUI.showInputBox({
            title: 'Quick Auth',
            placeHolder: `Enter your ${credName}`,
            value: defaultUsername,
            prompt:
                inferredUsername && inferredUsername === defaultUsername
                    ? `This ${credName} was inferred from your existing credentials`
                    : undefined,
            valueSelection: defaultUsername ? [0, defaultUsername.length] : undefined,
            buttons: [QuickInputButtons.Back],
        });
    }

    public passwordInput(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            title: 'Quick Auth',
            placeHolder:
                state.authenticationType === AuthType.ApiToken ? 'Enter your API token' : 'Enter your password',
            password: true,
            value: state.password || '',
            valueSelection: state.password ? [0, state.password.length] : undefined,
            buttons: [QuickInputButtons.Back],
            debounceValidationMs: 3000,
            validateInput: async (value) => {
                if (!value) {
                    return 'Password is required';
                }

                const isGood = await Container.loginManager.testCredentials(
                    {
                        host: state.site || '',
                        product: ProductJira,
                    },
                    {
                        username: state.username,
                        password: value,
                    } as BasicAuthInfo,
                );

                return isGood
                    ? {
                          message: '✅ Password validated successfully',
                          severity: InputBoxValidationSeverity.Info,
                      }
                    : {
                          message: 'Invalid password',
                          severity: InputBoxValidationSeverity.Warning,
                      };
            },
        });
    }

    public createTokenPrompt(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showQuickPick(
            [
                {
                    label: 'Yes',
                    description: 'Create a new API token',
                    detail: 'Choose this to open the API token management page in your browser',
                },
                {
                    label: 'No',
                    description: 'Use an existing API token',
                    detail: 'Choose this if you already have an API token ready to use',
                },
            ],
            {
                placeHolder: 'Would you like to open the API token management page?',
                buttons: [QuickInputButtons.Back],
            },
        );
    }

    public openApiManagementPage(): void {
        // Open the API token management page in the user's browser
        const url = 'https://id.atlassian.com/manage-profile/security/api-tokens';
        env.openExternal(Uri.parse(url));
    }
}
