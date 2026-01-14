import * as React from 'react';

import { inChatButtonStyles, inChatSecondaryButtonStyles } from '../../rovoDevViewStyles';

const formStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
    maxWidth: '400px',
};

const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--vscode-input-border)',
    backgroundColor: 'var(--vscode-input-background)',
    color: 'var(--vscode-input-foreground)',
    borderRadius: '2px',
    fontSize: '13px',
    fontFamily: 'var(--vscode-font-family)',
    boxSizing: 'border-box',
};

const labelStyles: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '4px',
    color: 'var(--vscode-foreground)',
};

const buttonContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
};

export const RovoDevLoginForm: React.FC<{
    onSubmit: (host: string, email: string, apiToken: string) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [host, setHost] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [apiToken, setApiToken] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

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

    return (
        <form onSubmit={handleSubmit} style={formStyles}>
            <div>
                <label style={labelStyles}>Jira Cloud Site</label>
                <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="yoursite.atlassian.net"
                    style={inputStyles}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <div>
                <label style={labelStyles}>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    style={inputStyles}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <div>
                <label style={labelStyles}>API Token</label>
                <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Your Jira API token"
                    style={inputStyles}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <div style={buttonContainerStyles}>
                <button
                    type="submit"
                    style={inChatButtonStyles}
                    disabled={isSubmitting || !host || !email || !apiToken}
                >
                    {isSubmitting ? 'Authenticating...' : 'Sign In'}
                </button>
                <button type="button" onClick={onCancel} style={inChatSecondaryButtonStyles} disabled={isSubmitting}>
                    Cancel
                </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '8px' }}>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        window.open(
                            'https://id.atlassian.com/manage-profile/security/api-tokens?autofillToken&expiryDays=max&appId=rovodev&selectedScopes=all',
                            '_blank',
                        );
                    }}
                    style={{ color: 'var(--vscode-textLink-foreground)' }}
                >
                    Create an API token
                </a>{' '}
                in your Atlassian account
            </div>
        </form>
    );
};
