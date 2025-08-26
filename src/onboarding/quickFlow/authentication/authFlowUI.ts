import { ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import {
    env,
    InputBoxOptions,
    QuickInputButton,
    QuickInputButtons,
    QuickPickItem,
    QuickPickItemKind,
    ThemeIcon,
    Uri,
} from 'vscode';

import { BaseUI, UiResponse } from '../baseUI';
import {
    AuthenticationType,
    AuthFlowData,
    ServerCredentialType,
    SpecialSiteOptions,
    SSLConfigurationType,
} from './types';

export type ExtraOptions = {
    step?: number;
    totalSteps?: number;
    buttons?: QuickInputButton[];
    buttonHandler?: (e: QuickInputButton) => void;
    value?: string;
    prompt?: string;
};

type PartialData = Partial<AuthFlowData>;

export class AuthFlowUI {
    constructor(private readonly baseUI: BaseUI = new BaseUI('Authenticate with Jira')) {}

    // QuickPicks

    public pickServerCredentialType(state: PartialData): Promise<UiResponse<ServerCredentialType>> {
        return this.baseUI.showQuickPick(
            [
                {
                    label: ServerCredentialType.Basic,
                    detail: 'Simple and secure username/password authentication, applicable in most cases',
                },
                {
                    label: ServerCredentialType.PAT,
                    detail: "Choose this if you already have a Personal Access Token you'd like to use instead",
                },
            ],
            {
                placeHolder: 'How would you like to authenticate?',
                value: state.serverCredentialType || '',
            },
        );
    }

    public pickSite(state: PartialData): Promise<UiResponse<SpecialSiteOptions | string>> {
        const sites: QuickPickItem[] = Container.siteManager
            .getSitesAvailable(ProductJira)
            .filter((site) => site.isCloud === (state.authenticationType !== AuthenticationType.Server))
            .map((site) => ({
                label: site.host,
                iconPath: site.isCloud ? new ThemeIcon('cloud') : new ThemeIcon('server'),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        if (sites.length === 0 && state.authenticationType === AuthenticationType.ApiToken) {
            sites.push({
                label: SpecialSiteOptions.OAuth,
                // TODO: actually trigger OAuth here once we can await on flows
                detail: 'You can run OAuth from the previous step',
                iconPath: new ThemeIcon('info'),
            });
        }
        const choices = [
            {
                label: SpecialSiteOptions.NewSite,
                iconPath: new ThemeIcon('add'),
            },
            {
                label: '',
                kind: QuickPickItemKind.Separator,
            },
            ...sites,
        ];
        return this.baseUI.showQuickPick(choices, {
            placeHolder: 'Select a site to authenticate with',
            validateSelection: (items) =>
                items.length > 0 && !items.some((item) => item.label.includes('Login with OAuth')),
        });
    }

    public pickAuthenticationType(state: PartialData): Promise<UiResponse<AuthenticationType>> {
        return this.baseUI.showQuickPick(
            [
                {
                    iconPath: new ThemeIcon('cloud'),
                    label: AuthenticationType.OAuth,
                    description: 'Authenticate using OAuth',
                    detail: 'Get basic access to your Atlassian work items',
                },
                {
                    iconPath: new ThemeIcon('key'),
                    label: AuthenticationType.ApiToken,
                    description: 'Authenticate via an API token',
                    detail: 'Get the full power of Atlassian integration, including experimental and AI features',
                },
                {
                    iconPath: new ThemeIcon('server'),
                    label: AuthenticationType.Server,
                    description: 'Authenticate with Jira Server or Datacenter',
                    detail: 'Use this if you have a self-hosted Jira instance or Jira DC',
                },
            ],
            {
                placeHolder: 'How would you like to authenticate?',
                value: state.authenticationType || '',
            },
        );
    }

    public pickContextPathNeeded(state: PartialData): Promise<UiResponse<'Yes' | 'No'>> {
        const site = state.site;
        return this.baseUI.showQuickPick(
            [
                {
                    label: 'Yes',
                    description: 'Your Jira server has a path',
                    detail: `For example: https://${site}/path/to/jira`,
                },
                {
                    label: 'No',
                    description: 'Your Jira server is running at the root',
                    detail: `For example: https://${site}/`,
                },
            ],
            {
                placeHolder: 'Does your server have a context path?',
                value: state.isContextPathNeeded === undefined ? '' : state.isContextPathNeeded ? 'Yes' : 'No',
                buttons: [
                    QuickInputButtons.Back,
                    { iconPath: new ThemeIcon('info'), tooltip: 'Learn more about context paths' },
                ],
                buttonHandler: (button) => {
                    if (button.tooltip === 'Learn more about context paths') {
                        // Open the documentation link
                        env.openExternal(
                            Uri.parse(
                                'https://confluence.atlassian.com/kb/set-a-context-path-for-atlassian-applications-836601189.html',
                            ),
                        );
                    }
                },
            },
        );
    }

    pickSslConfigurationType(state: PartialData): Promise<UiResponse<SSLConfigurationType>> {
        return this.baseUI.showQuickPick(
            [
                {
                    label: SSLConfigurationType.Default,
                    detail: 'Applicable for most cases',
                },
                {
                    kind: QuickPickItemKind.Separator,
                    label: '',
                },
                {
                    label: SSLConfigurationType.CustomCA,
                    detail: 'Choose this to provide paths to your custom CA certificates',
                },
                {
                    label: SSLConfigurationType.CustomClientSideCerts,
                    detail: 'Choose this to specify a PFX file and its passphrase, if necessary',
                },
            ],
            {
                placeHolder: 'Select SSL Configuration Type',
                value: state.sslConfigurationType || '',
            },
        );
    }

    public pickCreateTokenNeeded(state: PartialData): Promise<UiResponse<'Yes' | 'No'>> {
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
            },
        );
    }

    // Text boxes

    public inputNewSite(state: PartialData): Promise<UiResponse> {
        const defaults: Partial<InputBoxOptions> = {
            value: state.site || '',
            valueSelection: state.site ? [0, state.site.length] : undefined,
        };

        if (state.authenticationType !== AuthenticationType.Server) {
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
            placeHolder: 'Enter your new site name',
            ...defaults,
        });
    }

    public inputContextPath(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            placeHolder: 'Does your server have a context path?',
            value: state.contextPath || '',
            buttons: [
                QuickInputButtons.Back,
                { iconPath: new ThemeIcon('info'), tooltip: 'Learn more about context paths' },
            ],
            buttonHandler: (button) => {
                if (button.tooltip === 'Learn more about context paths') {
                    // Open the documentation link
                    env.openExternal(
                        Uri.parse(
                            'https://confluence.atlassian.com/kb/set-a-context-path-for-atlassian-applications-836601189.html',
                        ),
                    );
                }
            },
        });
    }

    inputSslCertsPath(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            placeHolder: 'Enter the path to your SSL certificates',
            prompt: 'Use comma if you have multiple paths',
            value: state.sslCertsPath || '',
        });
    }

    inputPfxPath(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            placeHolder: 'Enter the path to your PFX file',
            value: state.pfxPath || '',
        });
    }

    inputPfxPassphrase(state: PartialData): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            placeHolder: 'Enter the passphrase for your PFX file',
            value: state.pfxPassphrase || '',
        });
    }

    public async inputUsername(state: PartialData): Promise<UiResponse> {
        const inferredUsername = await this.getDefaultUsername(state);
        const defaultUsername = state.username || inferredUsername;

        const credName = state.authenticationType === AuthenticationType.ApiToken ? 'email address' : 'username';

        return this.baseUI.showInputBox({
            placeHolder: `Enter your ${credName}`,
            value: defaultUsername,
            prompt:
                inferredUsername && inferredUsername === defaultUsername
                    ? `This ${credName} was inferred from your existing credentials`
                    : undefined,
            valueSelection: defaultUsername ? [0, defaultUsername.length] : undefined,
        });
    }

    public inputPassword(state: PartialData, passwordName: string): Promise<UiResponse> {
        return this.baseUI.showInputBox({
            placeHolder: `Enter your ${passwordName}`,
            password: true,
            value: state.password || '',
            valueSelection: state.password ? [0, state.password.length] : undefined,
        });
    }

    // Helpers

    private async getDefaultUsername(state: PartialData): Promise<string> {
        if (state.authenticationType !== AuthenticationType.ApiToken) {
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

    public openApiManagementPage(): void {
        // Open the API token management page in the user's browser
        const url = 'https://id.atlassian.com/manage-profile/security/api-tokens';
        env.openExternal(Uri.parse(url));
    }
}
