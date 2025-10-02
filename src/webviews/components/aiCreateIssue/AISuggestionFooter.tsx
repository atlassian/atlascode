import 'src/react/atlascode/rovo-dev/RovoDev.css';

import { Checkbox } from '@atlaskit/checkbox';
import { HelperMessage } from '@atlaskit/form';
import StatusInformationIcon from '@atlaskit/icon/core/status-information';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import TextArea from '@atlaskit/textarea';
import Tooltip from '@atlaskit/tooltip';
import React, { useState } from 'react';
import { SimplifiedTodoIssueData } from 'src/config/model';

type FeedbackData = {
    description: string;
    contactMe: boolean;
};

const AISuggestionFooter: React.FC<{
    vscodeApi: any;
}> = ({ vscodeApi }) => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [todoData, setTodoData] = useState<SimplifiedTodoIssueData | null>(null);
    const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);

    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'updateAiSettings') {
            setIsAvailable(message.newState.isAvailable);
            setIsEnabled(message.newState.isEnabled);
            setTodoData(message.todoData);
        }
    });

    const handleFeedback = (isPositive: boolean, feedbackData?: FeedbackData) => {
        vscodeApi.postMessage({
            action: 'aiSuggestionFeedback',
            isPositive,
            todoData,
            feedbackData,
        });
        setFeedbackSent(true);
    };

    return (
        (isAvailable && isEnabled && (
            <div style={{ marginTop: '12px' }}>
                {showFeedbackOverlay && (
                    <FeedbackOverlay
                        message="Please provide feedback to improve Rovo Dev work item generation"
                        onSubmit={(fd) => {
                            setShowFeedbackOverlay(false);
                            handleFeedback(false, fd);
                        }}
                        onCancel={() => setShowFeedbackOverlay(false)}
                    />
                )}
                <HelperMessage>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginLeft: '6px', marginRight: '6px' }}>
                            <StatusInformationIcon label="info" size="small" />
                        </span>
                        <span>
                            <a href="https://www.atlassian.com/trust/atlassian-intelligence">
                                Uses AI. Verify results.
                            </a>
                        </span>
                    </span>
                </HelperMessage>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minWidth: '100%',
                    }}
                >
                    <HelperMessage style={{ marginTop: '10px' }}>
                        {feedbackSent
                            ? 'Thank you for your feedback! Your input helps us improve Rovo Dev.'
                            : 'Please provide feedback to improve Rovo Dev work item generation'}
                    </HelperMessage>
                    <div className="chat-message-actions" style={{ display: 'flex', gap: '2px', marginTop: '10px' }}>
                        <div style={{ flex: 1 }}></div>
                        <Tooltip content="Helpful">
                            <button
                                onClick={() => handleFeedback(true)}
                                type="button"
                                aria-label="like-response-button"
                                className="chat-message-action"
                                style={{ visibility: feedbackSent ? 'hidden' : 'visible' }}
                            >
                                <ThumbsUpIcon label="thumbs-up" spacing="none" />
                            </button>
                        </Tooltip>
                        <Tooltip content="Unhelpful">
                            <button
                                onClick={() => {
                                    setShowFeedbackOverlay(true);
                                }}
                                type="button"
                                aria-label="dislike-response-button"
                                className="chat-message-action"
                                style={{ visibility: feedbackSent ? 'hidden' : 'visible' }}
                            >
                                <ThumbsDownIcon label="thumbs-down" spacing="none" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        )) ||
        null
    );
};

/**
 * Largely auto-generated feedback form. Not an actual <Form> to avoid nesting.
 * Not reusing rovodev styles here since they are pretty different from the CreateIssuePage
 */
const FeedbackOverlay: React.FC<{
    message: string;
    onSubmit: (fd: FeedbackData) => void;
    onCancel: () => void;
}> = ({ message, onSubmit, onCancel }) => {
    const [description, setDescription] = useState('');
    const [contactMe, setContactMe] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        const data = { description: description.trim(), contactMe };

        // Handle form submission - send feedback data
        console.log('Feedback submitted:', data);
        onSubmit(data);
    };
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
            }}
            onClick={() => onCancel()}
        >
            <div
                style={{
                    backgroundColor: 'var(--vscode-editor-background)',
                    color: 'var(--vscode-editor-foreground)',
                    padding: '24px',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--vscode-panel-border)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    style={{
                        marginTop: 0,
                        marginBottom: '16px',
                        color: 'var(--vscode-editor-foreground)',
                    }}
                >
                    Provide Feedback
                </h3>
                <p
                    style={{
                        marginBottom: '20px',
                        color: 'var(--vscode-descriptionForeground)',
                    }}
                >
                    {message}
                </p>

                <div>
                    <div style={{ marginBottom: '16px' }}>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                color: 'var(--vscode-editor-foreground)',
                                fontSize: '13px',
                                fontWeight: '500',
                            }}
                        >
                            What went wrong? How can we improve? *
                        </label>
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please describe the issue or suggestion for improvement..."
                            minimumRows={4}
                            resize="auto"
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <Checkbox
                            isChecked={contactMe}
                            onChange={(e: any) => setContactMe(e.currentTarget.checked)}
                            label="I'd like to be contacted about this feedback"
                        />
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--vscode-panel-border)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                backgroundColor: 'transparent',
                                color: 'var(--vscode-button-secondaryForeground)',
                                border: '1px solid var(--vscode-button-secondaryBorder)',
                                borderRadius: '4px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            style={{
                                backgroundColor: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                            }}
                        >
                            Submit Feedback
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISuggestionFooter;
