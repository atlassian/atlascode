import { cssMap } from '@atlaskit/css';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import ZoomInIcon from '@atlaskit/icon/core/zoom-in';
import AiGenerativeRemoveSilenceIcon from '@atlaskit/icon-lab/core/ai-generative-remove-silence';
import RandomizeIcon from '@atlaskit/icon-lab/core/randomize';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import React from 'react';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client';

interface AgentModeSectionProps {
    currentMode: AgentMode | null;
    availableModes: RovoDevModeInfo[];
    setAgentMode: (mode: AgentMode) => void;
}

const getModeIcon = (mode: string) => {
    switch (mode) {
        case 'default':
            return <RandomizeIcon label={'default mode'} />;
        case 'plan':
            return <ZoomInIcon label={'plan mode'} />;
        case 'ask':
            return <AiGenerativeRemoveSilenceIcon label={'ask mode'} />;
        default:
            return null;
    }
};

const formatModeLabel = (mode: string): string => {
    switch (mode) {
        case 'default':
            return 'Default';
        case 'plan':
            return 'Deep plan mode';
        case 'ask':
            return 'Ask mode';
        default:
            return mode;
    }
};

const styles = cssMap({
    modesContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
    },
    modeItem: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        padding: token('space.100', '8px'),
        cursor: 'pointer',
    },
    modeLogo: {
        display: 'flex',
    },
    modeContext: {
        flex: 1,
    },
    modeAction: {
        marginLeft: 'auto',
    },
    labelText: {
        fontWeight: token('font.weight.semibold', '600'),
        margin: 0,
    },
});

const AgentModeSection: React.FC<AgentModeSectionProps> = ({
    currentMode,
    availableModes,
    setAgentMode,
}: AgentModeSectionProps) => {
    const handleModeSelect = (mode: AgentMode) => {
        try {
            setAgentMode(mode);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box>
            <p
                style={{
                    fontSize: '12px',
                    fontWeight: token('font.weight.semibold', '600'),
                    color: 'var(--vscode-descriptionForeground)',
                    margin: 0,
                    marginBottom: token('space.100', '8px'),
                }}
            >
                Reasoning
            </p>
            <Box xcss={styles.modesContainer}>
                {availableModes.map((modeInfo) => {
                    const isSelected = currentMode === modeInfo.mode;
                    const modeIcon = getModeIcon(modeInfo.mode);

                    return (
                        <Box
                            key={modeInfo.mode}
                            xcss={styles.modeItem}
                            onClick={() => handleModeSelect(modeInfo.mode as AgentMode)}
                            style={{
                                backgroundColor: 'var(--vscode-sideBar-background)',
                                borderRadius: '8px',
                            }}
                        >
                            {modeIcon && <Box xcss={styles.modeLogo}>{modeIcon}</Box>}
                            <Box id="prompt-settings-context" xcss={styles.modeContext}>
                                <Box
                                    as="p"
                                    xcss={styles.labelText}
                                    style={{
                                        fontSize: '13px',
                                        color: 'var(--vscode-foreground)',
                                    }}
                                >
                                    {formatModeLabel(modeInfo.mode)}
                                </Box>
                                <Box
                                    as="p"
                                    style={{
                                        fontSize: '11px',
                                        margin: `${token('space.050', '4px')} 0 0 0`,
                                        color: 'var(--vscode-descriptionForeground)',
                                    }}
                                >
                                    {modeInfo.description}
                                </Box>
                            </Box>
                            {isSelected && (
                                <Box xcss={styles.modeAction}>
                                    <CheckMarkIcon label="Selected" />
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default AgentModeSection;
