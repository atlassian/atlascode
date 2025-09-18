import AiGenerativeTextSummaryIcon from '@atlaskit/icon/core/ai-generative-text-summary';
import CrossIcon from '@atlaskit/icon/core/cross';
import CustomizeIcon from '@atlaskit/icon/core/customize';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import Toggle from '@atlaskit/toggle';
import React from 'react';
interface PromptSettingsPopupProps {
    onToggleDeepPlan: () => void;
    isDeepPlanEnabled: boolean;
    onClose: () => void;
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
                ...props.style,
            }}
            ref={ref}
        >
            {children}
        </div>
    ),
);

const PromptSettingsPopup: React.FC<PromptSettingsPopupProps> = ({ onToggleDeepPlan, isDeepPlanEnabled, onClose }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <Popup
            shouldRenderToParent
            isOpen={isOpen}
            trigger={(props) => (
                <>
                    {isOpen ? (
                        <button
                            {...props}
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="prompt-button-secondary-open"
                            aria-label="Prompt settings (open)"
                        >
                            <CrossIcon label="Close prompt settings" />
                        </button>
                    ) : (
                        <button
                            {...props}
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="prompt-button-secondary"
                            aria-label="Prompt settings"
                        >
                            <CustomizeIcon label="Prompt settings" />
                        </button>
                    )}
                </>
            )}
            content={() => (
                <PromptSettingsItem
                    label="Plan"
                    description="Tackle complex, multi-step code by first generating a plan before coding."
                    action={onToggleDeepPlan}
                    actionType="toggle"
                    toggled={isDeepPlanEnabled}
                />
            )}
            placement="top-start"
            popupComponent={PopupContainer}
            onClose={() => {
                setIsOpen(false);
                onClose();
            }}
        />
    );
};

const PromptSettingsItem: React.FC<{
    label: string;
    description: string;
    action?: () => void;
    actionType?: 'toggle' | 'button';
    toggled?: boolean;
}> = ({ label, description, action, actionType, toggled }) => {
    return (
        <div className="prompt-settings-item">
            <div className="prompt-settings-logo">
                {(() => {
                    switch (label) {
                        case 'Plan':
                            return <AiGenerativeTextSummaryIcon label="Deep plan" />;
                        default:
                            return <CustomizeIcon label="Customize prompt" />;
                    }
                })()}
            </div>
            <div id="prompt-settings-context">
                <p style={{ fontWeight: 'bold' }}>{label}</p>
                <p style={{ fontSize: '11px' }}>{description}</p>
            </div>
            {action && (
                <div className="prompt-settings-action">
                    {actionType === 'toggle' ? (
                        <Toggle isChecked={toggled} onChange={() => action()} label={`${label} toggle`} />
                    ) : (
                        <button aria-label="prompt-settings-action" />
                    )}
                </div>
            )}
        </div>
    );
};

export default PromptSettingsPopup;
