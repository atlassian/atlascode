import Button from '@atlaskit/button';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import React from 'react';
import { RovoDevAgentModel } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import { PromptAgentModel } from './AgentModelItem';

interface AgentModelSelectorProps {
    currentModel: RovoDevAgentModel | undefined;
    availableModels: RovoDevAgentModel[];
    onModelChange: (model: RovoDevAgentModel) => void;
    isDisabled?: boolean;
}

// TODO - this is a patch, the id format needs to be returned consistently by Rovo Dev
function sanitizeModelId(modelId: string): string {
    if (modelId.startsWith('alloy:')) {
        return 'alloy:' + modelId.substring('alloy:'.length).split(',').map(sanitizeModelId).join(',');
    } else if (modelId.includes(':')) {
        const match = modelId.match(/^[^:]+:(.*)/);
        return match ? match[1] : modelId;
    } else {
        return modelId;
    }
}

const PopupContainer = React.forwardRef<HTMLDivElement, PopupComponentProps>(
    ({ children, 'data-testid': testId, xcss: _xcss, ...props }, ref) => (
        <div
            className={props.className}
            {...props}
            style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-editorWidget-border)',
                borderRadius: '8px',
                padding: '16px',
                marginRight: '16px',
                maxWidth: '350px',
                height: '75%',
                overflowY: 'auto',
                ...props.style,
            }}
            ref={ref}
        >
            {children}
        </div>
    ),
);

export const AgentModelSelector: React.FC<AgentModelSelectorProps> = ({
    currentModel,
    availableModels,
    onModelChange,
    isDisabled,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    // try to match the current model against the available models
    const currentModelFromAvailable = React.useMemo(
        () =>
            currentModel &&
            availableModels.find(
                (model) =>
                    currentModel.modelId === model.modelId || currentModel.modelId === sanitizeModelId(model.modelId),
            ),
        [currentModel, availableModels],
    );

    const currentModelName = React.useMemo(
        () => (currentModelFromAvailable || currentModel)?.modelName,
        [currentModelFromAvailable, currentModel],
    );

    if (!currentModelName || availableModels.length === 0) {
        return null;
    }

    return (
        <Popup
            shouldRenderToParent
            isOpen={isOpen}
            trigger={(props) => (
                <Button
                    {...props}
                    appearance="subtle"
                    isSelected={isOpen}
                    iconAfter={<ChevronDownIcon label="Open" />}
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label="Agent model selection"
                    isDisabled={isDisabled}
                >
                    {currentModelName}
                </Button>
            )}
            content={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableModels.map((model) => (
                        <PromptAgentModel
                            label={model.modelName}
                            description={`${model.creditMultiplier}x credits`}
                            action={() => {
                                onModelChange(model);
                                setIsOpen(false);
                            }}
                            toggled={model === currentModelFromAvailable}
                        />
                    ))}
                </div>
            )}
            placement="top-start"
            popupComponent={PopupContainer}
            onClose={() => setIsOpen(false)}
        />
    );
};
