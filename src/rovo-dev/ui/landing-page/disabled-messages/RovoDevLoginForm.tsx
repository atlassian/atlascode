import Button from '@atlaskit/button/new';
import { CreatableSelect } from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import * as React from 'react';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

const formStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
};

const fieldRowStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
};

const labelStyles: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'left',
};

const buttonContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
};

// Fix z-index issues with dropdown menus in webview
const selectStyles = {
    placeholder: (base: any) => ({
        ...base,
        textAlign: 'left',
        fontSize: '13px',
    }),
    input: (base: any) => ({
        ...base,
        textAlign: 'left',
        fontSize: '13px',
    }),
    singleValue: (base: any) => ({
        ...base,
        textAlign: 'left',
        fontSize: '13px',
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

const textFieldStyles: React.CSSProperties = {
    fontSize: '13px',
};

export interface CredentialHint {
    email: string;
}

export const RovoDevLoginForm: React.FC<{
    onSubmit: (email: string, apiToken: string) => void;
    credentialHints?: CredentialHint[];
}> = ({ onSubmit, credentialHints = [] }) => {
    const [email, setEmail] = React.useState('');
    const [emailInputValue, setEmailInputValue] = React.useState('');

    const [apiToken, setApiToken] = React.useState('');
    const [authValidationState, setAuthValidationState] = React.useState<{
        isValidating: boolean;
        error?: string;
    }>({ isValidating: false });

    const emailSelectRef = React.useRef<any>(null);
    const apiTokenInputRef = React.useRef<HTMLInputElement>(null);

    // Listen for validation events from the extension
    React.useEffect(() => {
        const messageHandler = (event: MessageEvent): void => {
            const message = event.data as RovoDevProviderMessage;
            if (message.type === RovoDevProviderMessageType.RovoDevAuthValidating) {
                setAuthValidationState({ isValidating: true });
            } else if (message.type === RovoDevProviderMessageType.RovoDevAuthValidationComplete) {
                setAuthValidationState({
                    isValidating: false,
                    error: message.success ? undefined : message.error,
                });
            }
        };

        window.addEventListener('message', messageHandler);
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !apiToken) {
            return;
        }

        onSubmit(email, apiToken);
    };

    // Create unique email options from existing credentials
    const emailOptions = React.useMemo(
        () => Array.from(new Set(credentialHints.map((c) => c.email))).map((e) => ({ label: e, value: e })),
        [credentialHints],
    );

    return (
        <form onSubmit={handleSubmit} style={formStyles}>
            {authValidationState.error && (
                <div
                    style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                        border: '1px solid var(--vscode-inputValidation-errorBorder)',
                        borderRadius: '4px',
                        color: 'var(--vscode-inputValidation-errorForeground)',
                        fontSize: '12px',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                    }}
                >
                    {authValidationState.error}
                </div>
            )}
            <div style={fieldRowStyles}>
                <label htmlFor="email" style={labelStyles}>
                    Email
                </label>
                <CreatableSelect
                    ref={emailSelectRef}
                    inputId="email"
                    options={emailOptions}
                    placeholder="your.email@example.com"
                    isClearable
                    isDisabled={authValidationState.isValidating}
                    value={email ? { label: email, value: email } : null}
                    inputValue={emailInputValue}
                    tabSelectsValue={true}
                    onInputChange={(newValue: string) => {
                        setEmailInputValue(newValue);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        // Move focus to next field on Tab
                        if (e.key === 'Tab' && !e.shiftKey) {
                            setTimeout(() => apiTokenInputRef.current?.focus(), 0);
                        }
                    }}
                    onBlur={() => {
                        if (emailInputValue.trim().length > 0) {
                            setEmail(emailInputValue.trim());
                            setEmailInputValue('');
                        }
                    }}
                    onChange={(option: any) => {
                        setEmail(option?.value || '');
                        setEmailInputValue('');
                        if (option?.value) {
                            setTimeout(() => apiTokenInputRef.current?.focus(), 0);
                        }
                    }}
                    formatCreateLabel={(inputValue: any) => `Use "${inputValue}"`}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                />
            </div>

            <div style={fieldRowStyles}>
                <label htmlFor="apiToken" style={labelStyles}>
                    Rovo Dev API Token (
                    <a
                        href="https://id.atlassian.com/manage-profile/security/api-tokens?autofillToken&expiryDays=max&appId=rovodev&selectedScopes=all"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--vscode-textLink-foreground)', textDecoration: 'none' }}
                    >
                        create <span className="codicon codicon-link-external" style={{ fontSize: '10px' }} />
                    </a>
                    )
                </label>
                <Textfield
                    ref={apiTokenInputRef}
                    name="apiToken"
                    id="apiToken"
                    type="password"
                    value={apiToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiToken(e.target.value)}
                    placeholder="Your Rovo Dev API token"
                    isDisabled={authValidationState.isValidating}
                    autoComplete="off"
                    style={textFieldStyles}
                />
            </div>

            <div style={buttonContainerStyles}>
                <Button
                    type="submit"
                    appearance="primary"
                    isDisabled={authValidationState.isValidating || !email || !apiToken}
                >
                    {authValidationState.isValidating ? 'Authenticating...' : 'Sign In'}
                </Button>
            </div>
        </form>
    );
};
