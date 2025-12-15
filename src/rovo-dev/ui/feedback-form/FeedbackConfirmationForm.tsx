import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossIcon from '@atlaskit/icon/core/cross';
import React from 'react';

export interface FeedbackConfirmationFormProps {
    onClose: () => void;
}

export const FeedbackConfirmationForm: React.FC<FeedbackConfirmationFormProps> = ({ onClose: onClose }) => {
    return (
        <div className="form-container" style={{ zIndex: 2000 }}>
            <button
                type="button"
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--vscode-button-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--vscode-testing-iconPassed)' }}>
                        <CheckCircleIcon label="Success" size="small" />
                    </span>
                    <span style={{ color: 'var(--ds-icon-accent-white)' }}>Thanks</span>
                </div>
                <span>
                    <CrossIcon
                        size="small"
                        label="close the feedback confirmation form"
                        color="var(--ds-icon-accent-gray)"
                    />
                </span>
            </button>
            <p style={{ padding: '10px 16px' }}>Your valuable feedback helps us continually improve our products.</p>
        </div>
    );
};
