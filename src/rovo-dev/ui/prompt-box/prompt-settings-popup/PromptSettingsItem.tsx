import Toggle from '@atlaskit/toggle';
import React from 'react';

const PromptSettingsItem: React.FC<{
    icon: JSX.Element;
    label: string;
    description: string;
    action?: () => void;
    actionType?: 'toggle' | 'button';
    toggled?: boolean;
    isInternalOnly?: boolean;
}> = ({ icon, label, description, action, actionType, toggled, isInternalOnly }) => {
    return (
        <div className="prompt-settings-item">
            <div className="prompt-settings-logo">{icon}</div>
            <div>
                <p style={{ fontWeight: 'bold' }}>
                    {label}
                    {isInternalOnly && (
                        <span style={{ backgroundColor: 'var(--vscode-badge-background)', marginLeft: '8px' }}>
                            Internal only
                        </span>
                    )}
                </p>
                <p style={{ fontSize: '11px' }}>{description}</p>
            </div>
            {action && (
                <div className="prompt-settings-action">
                    <Toggle isChecked={toggled} onChange={action} label={`${label} toggle`} />
                </div>
            )}
        </div>
    );
};

export default PromptSettingsItem;
