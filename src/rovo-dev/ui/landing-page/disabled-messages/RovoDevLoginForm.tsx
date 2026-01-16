import Button from '@atlaskit/button/new';
import { CreatableSelect } from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import * as React from 'react';

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
    }),
    input: (base: any) => ({
        ...base,
        textAlign: 'left',
    }),
    singleValue: (base: any) => ({
        ...base,
        textAlign: 'left',
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

export interface CredentialHint {
    host: string;
    email: string;
}

export const RovoDevLoginForm: React.FC<{
    onSubmit: (host: string, email: string, apiToken: string) => void;
    onCancel: () => void;
    credentialHints?: CredentialHint[];
}> = ({ onSubmit, onCancel, credentialHints = [] }) => {
    const [host, setHost] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [apiToken, setApiToken] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const emailSelectRef = React.useRef<any>(null);
    const apiTokenInputRef = React.useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!host || !email || !apiToken) {
            return;
        }

        setIsSubmitting(true);
        try {
            onSubmit(host, email, apiToken);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Create unique host and email options from existing credentials
    const hostOptions = React.useMemo(
        () => Array.from(new Set(credentialHints.map((c) => c.host))).map((h) => ({ label: h, value: h })),
        [credentialHints],
    );
    const emailOptions = React.useMemo(
        () => Array.from(new Set(credentialHints.map((c) => c.email))).map((e) => ({ label: e, value: e })),
        [credentialHints],
    );

    return (
        <form onSubmit={handleSubmit} style={formStyles}>
            <div style={fieldRowStyles}>
                <label htmlFor="host" style={labelStyles}>
                    Jira Cloud Site
                </label>
                <CreatableSelect
                    inputId="host"
                    options={hostOptions}
                    placeholder="yoursite.atlassian.net"
                    isClearable
                    isDisabled={isSubmitting}
                    value={host ? { label: host, value: host } : null}
                    onChange={(option: any) => {
                        setHost(option?.value || '');
                        if (option?.value) {
                            setTimeout(() => emailSelectRef.current?.focus(), 0);
                        }
                    }}
                    formatCreateLabel={(inputValue: any) => `Use "${inputValue}"`}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                />
            </div>

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
                    isDisabled={isSubmitting}
                    value={email ? { label: email, value: email } : null}
                    onChange={(option: any) => {
                        setEmail(option?.value || '');
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
                    isDisabled={isSubmitting}
                    autoComplete="off"
                />
            </div>

            <div style={buttonContainerStyles}>
                <Button type="submit" appearance="primary" isDisabled={isSubmitting || !host || !email || !apiToken}>
                    {isSubmitting ? 'Authenticating...' : 'Sign In'}
                </Button>
                <Button appearance="subtle" onClick={onCancel} isDisabled={isSubmitting}>
                    Cancel
                </Button>
            </div>
        </form>
    );
};
