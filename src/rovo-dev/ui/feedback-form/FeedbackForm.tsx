import FeedbackIcon from '@atlaskit/icon/core/feedback';
import React from 'react';

export type FeedbackType = 'bug' | 'reportContent' | 'general';

export interface FeedbackFormProps {
    onSubmit: (feedbackType: FeedbackType, feedback: string, canContact: boolean, includeTenMessages: boolean) => void;
    onCancel: () => void;
    type?: 'like' | 'dislike';
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, onCancel, type }) => {
    const [includeTenMessages, setIncludeTenMessages] = React.useState(true);
    const [canContact, setCanContact] = React.useState(true);
    const [title, setTitle] = React.useState('Share your thoughts');
    const [feedbackType, setFeedbackType] = React.useState<FeedbackType>(type === 'dislike' ? 'bug' : 'general');
    const [options, setOptions] = React.useState<{ value: FeedbackType; label: string }[] | null>(null);

    React.useEffect(() => {
        if (type === 'like') {
            setFeedbackType('general');
        } else if (type === 'dislike') {
            setFeedbackType('bug');
            setTitle('Please, share your feedback');
            setOptions([
                { value: 'bug', label: 'Report bug' },
                { value: 'reportContent', label: 'Report harmful or inappropriate content' },
            ]);
        } else {
            setFeedbackType('general');
            setOptions([
                { value: 'general', label: 'General feedback' },
                { value: 'bug', label: 'Report bug' },
                { value: 'reportContent', label: 'Report harmful or inappropriate content' },
            ]);
        }
    }, [type]);

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedType = event.target.value as FeedbackType;
        setFeedbackType(selectedType);
        if (selectedType === 'general') {
            setTitle('Share your thoughts');
        } else if (selectedType === 'bug') {
            setTitle('Please, share your feedback');
        } else if (selectedType === 'reportContent') {
            setTitle('Report inappropriate content');
        }
    };
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const feedback = formData.get('feedback-message');
        const feedbackText = feedback ? feedback.toString() : '';
        onSubmit(feedbackType, feedbackText, canContact, includeTenMessages);
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form-body">
                <div className="form-header">
                    <FeedbackIcon label="feedback-icon" spacing="none" />
                    {title}
                </div>
                <div className="form-fields">
                    {type !== 'like' && (
                        <div className="form-field">
                            <label htmlFor="feedback-type">Type of feedback</label>
                            <select
                                className="form-select"
                                onChange={handleTypeChange}
                                id="feedback-type"
                                name="feedback-type"
                                defaultValue={''}
                                required
                            >
                                <option value="" disabled>
                                    Select feedback type
                                </option>
                                {options &&
                                    options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
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
                    <div className="form-field">
                        <div className="form-field-checkbox">
                            <input
                                type="checkbox"
                                checked={canContact}
                                onChange={(e) => setCanContact(e.target.checked)}
                            />
                            Atlassian can contact me about this feedback
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
