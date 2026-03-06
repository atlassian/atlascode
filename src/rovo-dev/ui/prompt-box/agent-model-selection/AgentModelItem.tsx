import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import React from 'react';

export const PromptAgentModel: React.FC<{
    label: string;
    description: string;
    action: () => void;
    toggled: boolean;
}> = ({ label, description, action, toggled }) => {
    return (
        <div className="agent-model-selector-item" onClick={action}>
            <div style={{ paddingRight: '16px' }}>
                <p style={{ fontWeight: 'bold' }}>{label}</p>
                <p style={{ fontSize: '11px' }}>{description}</p>
            </div>
            <div style={{ visibility: toggled ? 'visible' : 'hidden', marginLeft: 'auto' }}>
                <CheckMarkIcon label="Current model" />
            </div>
        </div>
    );
};
