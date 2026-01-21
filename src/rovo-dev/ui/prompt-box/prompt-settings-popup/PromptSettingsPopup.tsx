import AiGenerativeTextSummaryIcon from '@atlaskit/icon/core/ai-generative-text-summary';
import CrossIcon from '@atlaskit/icon/core/cross';
import CustomizeIcon from '@atlaskit/icon/core/customize';
import LockUnlockedIcon from '@atlaskit/icon/core/lock-unlocked';
import TelescopeIcon from '@atlaskit/icon-lab/core/telescope';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import React from 'react';

import AgentModeSection from './AgentModeSection';
import PromptSettingsItem from './PromptSettingsItem';

interface PromptSettingsPopupProps {
    onDeepPlanToggled?: () => void;
    onYoloModeToggled?: () => void;
    onFullContextToggled?: () => void;
    isDeepPlanEnabled: boolean;
    isYoloModeEnabled: boolean;
    isFullContextEnabled: boolean;
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

const PromptSettingsPopup: React.FC<PromptSettingsPopupProps> = ({
    onDeepPlanToggled,
    onYoloModeToggled,
    onFullContextToggled,
    isDeepPlanEnabled,
    isYoloModeEnabled,
    isFullContextEnabled,
    onClose,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    if (!onDeepPlanToggled && !onYoloModeToggled && !onFullContextToggled) {
        return null;
    }

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {onDeepPlanToggled && (
                        <PromptSettingsItem
                            icon={<AiGenerativeTextSummaryIcon label="Deep plan" />}
                            label="Plan"
                            description="Tackle complex, multi-step code by first generating a plan before coding."
                            action={onDeepPlanToggled}
                            actionType="toggle"
                            toggled={isDeepPlanEnabled}
                        />
                    )}
                    {onFullContextToggled && (
                        <PromptSettingsItem
                            icon={<TelescopeIcon label="Full-Context mode" />}
                            label="Full-Context mode"
                            description="Toggle Full-Context mode to enable the agent to research documents and historical data, helping it better understand the problem to solve."
                            action={onFullContextToggled}
                            actionType="toggle"
                            toggled={isFullContextEnabled}
                            isInternalOnly={true}
                        />
                    )}
                    {onYoloModeToggled && (
                        <PromptSettingsItem
                            icon={<LockUnlockedIcon label="YOLO mode" />}
                            label="YOLO"
                            description="Toggle yolo mode which runs all file CRUD operations and bash commands without confirmation. Use with caution!"
                            action={onYoloModeToggled}
                            actionType="toggle"
                            toggled={isYoloModeEnabled}
                        />
                    )}
                    <AgentModeSection enabled={true} />
                </div>
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

export default PromptSettingsPopup;
