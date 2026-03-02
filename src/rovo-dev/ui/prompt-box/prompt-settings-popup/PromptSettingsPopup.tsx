import { cssMap } from '@atlaskit/css';
import AiGenerativeTextSummaryIcon from '@atlaskit/icon/core/ai-generative-text-summary';
import CrossIcon from '@atlaskit/icon/core/cross';
import CustomizeIcon from '@atlaskit/icon/core/customize';
import LockUnlockedIcon from '@atlaskit/icon/core/lock-unlocked';
import TelescopeIcon from '@atlaskit/icon-lab/core/telescope';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import React, { useCallback } from 'react';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client';

import AgentModeSection from './AgentModeSection';
import PromptSettingsItem from './PromptSettingsItem';

const styles = cssMap({
    sectionTitle: {
        fontWeight: token('font.weight.semibold', '600'),
        margin: 0,
        marginBottom: token('space.100', '8px'),
    },
});

interface PromptSettingsPopupProps {
    onDeepPlanToggled?: () => void;
    onYoloModeToggled?: () => void;
    onFullContextToggled?: () => void;
    isDeepPlanEnabled: boolean;
    isYoloModeEnabled: boolean;
    isFullContextEnabled: boolean;
    availableAgentModes: RovoDevModeInfo[];
    currentAgentMode: AgentMode | null;
    onAgentModeChange: (mode: AgentMode) => void;
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
                maxWidth: '350px',
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
    availableAgentModes,
    currentAgentMode,
    onAgentModeChange,
    onClose,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleAgentModeChange = useCallback(
        (mode: AgentMode) => {
            onAgentModeChange(mode);
            setIsOpen(false);
            onClose();
        },
        [onAgentModeChange, onClose],
    );

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
                    <AgentModeSection
                        currentMode={currentAgentMode}
                        availableModes={availableAgentModes}
                        setAgentMode={handleAgentModeChange}
                    />
                    <Box
                        as="p"
                        xcss={styles.sectionTitle}
                        style={{
                            fontSize: '12px',
                        }}
                    >
                        Others
                    </Box>
                    {onDeepPlanToggled && (
                        <PromptSettingsItem
                            icon={<AiGenerativeTextSummaryIcon label="Deep plan" />}
                            label="Plan"
                            description="Tackle complex, multi-step code by first generating a plan before coding."
                            action={onDeepPlanToggled}
                            toggled={isDeepPlanEnabled}
                        />
                    )}
                    {onFullContextToggled && (
                        <PromptSettingsItem
                            icon={<TelescopeIcon label="Full-Context mode" />}
                            label="Full-Context mode"
                            description="Toggle Full-Context mode to enable the agent to research documents and historical data, helping it better understand the problem to solve."
                            action={onFullContextToggled}
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
                            toggled={isYoloModeEnabled}
                        />
                    )}
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
