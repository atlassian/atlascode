import CrossIcon from '@atlaskit/icon/core/cross';
import React from 'react';

export interface FeedbackConfirmationFormProps {
    onClose: () => void;
}

export const FeedbackConfirmationForm: React.FC<FeedbackConfirmationFormProps> = ({ onClose: onClose }) => {
    return (
        <div className="form-container">
            <button
                type="button"
                onClick={() => onClose()}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 'auto',
                }}
            >
                <CrossIcon
                    size="small"
                    label="close the feedback confirmation form"
                    color="var(--ds-icon-accent-gray)"
                />
            </button>
            <b>Thanks</b>
            <br />
            <p>Your valuable feedback helps us continually improve our apps.</p>
        </div>
    );
};
