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
    section: {
        marginTop: token('space.100', '8px'),
    },
    modesContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
    },
    modeItem: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: token('space.100', '8px'),
        padding: token('space.100', '8px'),
        cursor: 'pointer',
    },
    modeLogo: {
        display: 'flex',
        paddingTop: token('space.050', '4px'),
    },
    modeContext: {
        flex: 1,
    },
    modeAction: {
        marginLeft: 'auto',
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
        <Box xcss={styles.section}>
            <p
                style={{
                    fontSize: '12px',
                    fontWeight: token('font.weight.semibold', '600'),
                    color: 'var(--vscode-descriptionForeground)',
                    margin: 0,
                    marginBottom: token('space.100', '8px'),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
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
                                <p
                                    style={{
                                        fontWeight: token('font.weight.semibold', '600'),
                                        margin: 0,
                                        fontSize: '13px',
                                    }}
                                >
                                    {formatModeLabel(modeInfo.mode)}
                                </p>
                                <p
                                    style={{
                                        fontSize: '11px',
                                        margin: `${token('space.050', '4px')} 0 0 0`,
                                        color: 'var(--vscode-descriptionForeground)',
                                    }}
                                >
                                    {modeInfo.description}
                                </p>
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
