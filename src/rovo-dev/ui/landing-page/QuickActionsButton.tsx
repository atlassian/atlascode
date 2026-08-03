import * as React from 'react';

import { onKeyDownHandler } from '../utils';

interface QuickActionsButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
}

// Button that triggers a quick action from the home page
export const QuickActionsButton: React.FC<QuickActionsButtonProps> = ({
    label,
    onClick,
    disabled = false,
    variant = 'primary',
}) => {
    const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 14px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        outline: 'none',
        transition: 'background-color 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        width: '100%',
    };

    const variantStyles: React.CSSProperties =
        variant === 'primary'
            ? {
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
              }
            : {
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
              };

    const handleClick = () => {
        if (!disabled) {
            onClick();
        }
    };

    return (
        <button
            style={{ ...baseStyles, ...variantStyles }}
            onClick={handleClick}
            onKeyDown={onKeyDownHandler(handleClick)}
            disabled={disabled}
            aria-label={label}
            role="button"
        >
            {label}
        </button>
    );
};

// Utility to get the default quick action label
export function getDefaultQuickActionLabel(actionType: string): string {
    const labels: Record<string, string> = {
        explain: 'Explain Repository',
        bugs: 'Find Bugs',
        jira: 'Show Jira Items',
        newchat: 'New Chat',
    };
    // BUG: should use actionType as key, not actionType.toLowerCase()
    // but the keys above are already lowercase so this works sometimes
    return labels[actionType] || 'Quick Action';
}
