import Checkbox from '@atlaskit/checkbox';
import { HelperMessage } from '@atlaskit/form';
import React, { useCallback, useEffect, useState } from 'react';
import { IssueSuggestionContextLevel, IssueSuggestionSettings } from 'src/config/model';

interface VsCodeApi {
    postMessage(msg: {}): void;
}

const AISuggestionHeader: React.FC<{
    vscodeApi: VsCodeApi;
}> = ({ vscodeApi }) => {
    const [isFeatureFlagEnabled, setIsFeatureFlagEnabled] = useState(false);
    const [suggestionSettings, setSuggestionSettings] = useState<IssueSuggestionSettings>({
        isAvailable: false,
        isEnabled: false,
        level: IssueSuggestionContextLevel.CodeContext,
    });
    const { isAvailable, isEnabled, level } = suggestionSettings;

    const [todoData, setTodoData] = useState(null);

    useEffect(() => {
        if (!vscodeApi) {
            return;
        }

        vscodeApi.postMessage({
            action: 'webviewReady',
        });
    }, [vscodeApi]);

    const onLoginClick = useCallback(() => {
        vscodeApi.postMessage({ action: 'addApiToken' });
    }, [vscodeApi]);

    const updateIdeSettings = (newState: IssueSuggestionSettings) =>
        vscodeApi.postMessage({
            action: 'updateAiSettings',
            newState,
            todoData,
        });

    const generateIssueSuggestions = (updatedSettings: IssueSuggestionSettings) => {
        if (!todoData) {
            return;
        }
        window.postMessage({
            type: 'generateIssueSuggestions',
        });
        vscodeApi.postMessage({
            action: 'generateIssueSuggestions',
            todoData,
            suggestionSettings: {
                ...suggestionSettings,
                // Explicitly set the context level to the updated value
                ...updatedSettings,
            },
        });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newState = {
            isAvailable: isAvailable,
            isEnabled: e.target.checked,
            level: level,
        };
        setSuggestionSettings(newState);
        updateIdeSettings(newState);
        generateIssueSuggestions({ ...newState });

        // update the footer
        window.postMessage({
            type: 'updateAiSettings',
            newState,
            todoData,
        });
    };

    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'updateAiSettings') {
            setSuggestionSettings(message.newState);
            setTodoData(message.todoData);
        } else if (message.type === 'updateFeatureFlag') {
            console.log('updateFeatureFlag', message.value);
            setIsFeatureFlagEnabled(message.value);
        }
    });

    if (!todoData || !isFeatureFlagEnabled) {
        return <></>;
    }

    return isAvailable ? (
        <div>
            <hr className="ac-form-separator" />
            <Checkbox label="Use AI to create issue" isChecked={isEnabled} onChange={handleCheckboxChange} />
            <HelperMessage>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>AI will analyze your TODO and code context to suggest issue titles and descriptions.</span>
                    <span title="AI suggestions use your code and TODO comments to generate issue details.">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-label="Info"
                            style={{ verticalAlign: 'middle', cursor: 'pointer' }}
                        >
                            <circle cx="8" cy="8" r="7" stroke="#6B778C" strokeWidth="1.5" fill="#DEEBFF" />
                            <rect x="7.25" y="7" width="1.5" height="4" rx="0.75" fill="#6B778C" />
                            <rect x="7.25" y="4" width="1.5" height="1.5" rx="0.75" fill="#6B778C" />
                        </svg>
                    </span>
                </span>
            </HelperMessage>
        </div>
    ) : (
        <HelperMessage>
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>
                    <a
                        href="https://id.atlassian.com/manage-profile/security/api-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Create an API token
                    </a>{' '}
                    and add it here to use AI issue suggestions
                </span>
                <button type={'button'} style={{ marginTop: '0', fontSize: '12px' }} onClick={onLoginClick}>
                    Add API Token
                </button>
            </div>
        </HelperMessage>
    );
};

export default AISuggestionHeader;
