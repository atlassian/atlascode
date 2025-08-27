import FeedbackIcon from '@atlaskit/icon/core/feedback';
import React from 'react';

export interface FeedbackFormProps {
    title: string;
    onSumbit: (feedback: string, includeTenMessages: boolean) => void;
    onCancel: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ title, onSumbit, onCancel }) => {
    const [includeTenMessages, setIncludeTenMessages] = React.useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const feedback = formData.get('feedback-message')?.toString() || '';
        onSumbit(feedback, includeTenMessages);
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form-body">
                <div className="form-header">
                    <FeedbackIcon label="feedback-icon" spacing="none" />
                    {title}
                </div>
                <div className="form-fields">
                    <div className="form-field">
                        <label htmlFor="feedback-message">Feedback</label>
                        <textarea
                            id="feedback-message"
                            name="feedback-message"
                            placeholder="Enter your feedback"
                            required
                            rows={4}
                            style={{ resize: 'vertical' }}
                            autoFocus
                        />
                    </div>
                    <div className="form-field">
                        <div className="form-field-checkbox">
                            <input
                                type="checkbox"
                                checked={includeTenMessages}
                                onChange={(e) => setIncludeTenMessages(e.target.checked)}
                            />
                            Include last 10 messages in the feedback
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={() => onCancel()} className="form-cancel-button">
                        Cancel
                    </button>
                    <button type="submit" className="form-submit-button">
                        Send feedback
                    </button>
                </div>
            </form>
        </div>
    );
};
