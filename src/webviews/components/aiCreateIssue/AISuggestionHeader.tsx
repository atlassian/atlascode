import Checkbox from '@atlaskit/checkbox';
import { HelperMessage } from '@atlaskit/form';
import LightbulbIcon from '@atlaskit/icon/core/lightbulb';
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
        <div style={{ marginBottom: '15px' }}>
            <hr className="ac-form-separator" />
            <Checkbox
                label="Use Rovo Dev to generate the summary and description"
                isChecked={isEnabled}
                onChange={handleCheckboxChange}
            />
            <HelperMessage>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginLeft: '6px', marginRight: '6px' }}>
                        <LightbulbIcon label="info" size="small" />
                    </span>
                    <span>Rovo Dev reads the TODO comment and surrounding code for context</span>
                </span>
            </HelperMessage>
        </div>
    ) : (
        <HelperMessage>
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>
                    <span style={{ marginLeft: '6px', marginRight: '6px' }}>
                        <LightbulbIcon label="info" size="small" />
                    </span>
                    <a
                        href="https://id.atlassian.com/manage-profile/security/api-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Create an API token
                    </a>{' '}
                    and add it here to use Rovo Dev issue suggestions
                </span>
                <button type={'button'} style={{ marginTop: '0', fontSize: '12px' }} onClick={onLoginClick}>
                    Add API Token
                </button>
            </div>
        </HelperMessage>
    );
};

export default AISuggestionHeader;
