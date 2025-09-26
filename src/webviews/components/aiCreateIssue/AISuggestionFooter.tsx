import { HelperMessage } from '@atlaskit/form';
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
            <HelperMessage>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <span>AI-generated results may vary. Please provide feedback</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => handleFeedback(true)}>
                            👍
                        </span>
                        <span style={{ cursor: 'pointer' }} onClick={() => handleFeedback(false)}>
                            👎
                        </span>
                    </div>
                </div>
            </HelperMessage>
        )) ||
        null
    );
};

export default AISuggestionFooter;
