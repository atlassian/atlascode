import Checkbox from '@atlaskit/checkbox';
import { HelperMessage } from '@atlaskit/form';
import Select from '@atlaskit/select';
import React, { useEffect, useState } from 'react';
import { IssueSuggestionContextLevel, IssueSuggestionSettings } from 'src/config/model';

interface VsCodeApi {
    postMessage(msg: {}): void;
}

const contextLevelNames = new Map<string, string>([
    [IssueSuggestionContextLevel.CodeContext, 'Code context (Recommended)'],
    [IssueSuggestionContextLevel.TodoOnly, 'TODO text only'],
]);

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
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!vscodeApi) {
            return;
        }

        vscodeApi.postMessage({
            action: 'webviewReady',
        });
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
        setIsLoading(true);
        generateIssueSuggestions({ ...newState });

        // update the footer
        window.postMessage({
            type: 'updateAiSettings',
            newState,
            todoData,
        });
    };

    const handleSelectChange = (e: any) => {
        const newState = {
            isAvailable: isAvailable,
            isEnabled: isEnabled,
            level: e.value,
        };
        setSuggestionSettings(newState);
        updateIdeSettings(newState);
        setIsLoading(true);
        generateIssueSuggestions(newState);
    };

    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'updateAiSettings') {
            setSuggestionSettings(message.newState);
            setTodoData(message.todoData);
        } else if (message.type === 'update') {
            setIsLoading(false);
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
            <Checkbox label="Use AI to generate issue?" isChecked={isEnabled} onChange={handleCheckboxChange} />
            {isEnabled && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ flex: '1' }}>
                        <HelperMessage>
                            Please select the level of details you'd like to be used for the issue generation.
                        </HelperMessage>
                    </div>
                    <div style={{ flex: '1' }}>
                        <Select
                            className="ac-form-select-container"
                            classNamePrefix="ac-form-select"
                            isSearchable={false}
                            isLoading={isLoading}
                            value={{
                                label: contextLevelNames.get(level),
                                value: level,
                            }}
                            options={Array.from(contextLevelNames.entries()).map(([value, label]) => ({
                                value,
                                label,
                            }))}
                            onChange={handleSelectChange}
                        />
                    </div>
                </div>
            )}
        </div>
    ) : (
        <HelperMessage>
            Did you know you can use AI to generate issues? Please add an API key in the settings to enable this
            feature.
        </HelperMessage>
    );
};

export default AISuggestionHeader;
