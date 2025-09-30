import 'src/react/atlascode/rovo-dev/RovoDev.css';

import { HelperMessage } from '@atlaskit/form';
import StatusInformationIcon from '@atlaskit/icon/core/status-information';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import Tooltip from '@atlaskit/tooltip';
import React, { useState } from 'react';
import { SimplifiedTodoIssueData } from 'src/config/model';

const AISuggestionFooter: React.FC<{
    vscodeApi: any;
}> = ({ vscodeApi }) => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [todoData, setTodoData] = useState<SimplifiedTodoIssueData | null>(null);

    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'updateAiSettings') {
            setIsAvailable(message.newState.isAvailable);
            setIsEnabled(message.newState.isEnabled);
            setTodoData(message.todoData);
        }
    });

    const handleFeedback = (isPositive: boolean) => {
        vscodeApi.postMessage({
            action: 'aiSuggestionFeedback',
            isPositive,
            todoData,
        });
    };

    return (
        (isAvailable && isEnabled && (
            <div style={{ marginTop: '12px' }}>
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
                    <HelperMessage> Please provide feedback to improve Rovo Dev work item generation</HelperMessage>
                    <div className="chat-message-actions" style={{ display: 'flex', gap: '2px', marginTop: '10px' }}>
                        <div style={{ flex: 1 }}></div>
                        <Tooltip content="Helpful">
                            <button
                                onClick={() => handleFeedback(true)}
                                type="button"
                                aria-label="like-response-button"
                                className="chat-message-action"
                            >
                                <ThumbsUpIcon label="thumbs-up" spacing="none" />
                            </button>
                        </Tooltip>
                        <Tooltip content="Unhelpful">
                            <button
                                onClick={() => handleFeedback(false)}
                                type="button"
                                aria-label="dislike-response-button"
                                className="chat-message-action"
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

export default AISuggestionFooter;
