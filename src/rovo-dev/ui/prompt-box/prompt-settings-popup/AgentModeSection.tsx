import { cssMap } from '@atlaskit/css';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import ZoomInIcon from '@atlaskit/icon/core/zoom-in';
import AiGenerativeRemoveSilenceIcon from '@atlaskit/icon-lab/core/ai-generative-remove-silence';
import RandomizeIcon from '@atlaskit/icon-lab/core/randomize';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import React from 'react';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client';

const DISABLED_AGENT_MODES: readonly string[] = ['plan'];

/** Shown when the available modes list hasn't loaded yet, so the UI is never empty. */
const DEFAULT_AGENT_MODES: RovoDevModeInfo[] = [
    { mode: 'default', description: 'Full agent with read, write, and execute' },
    { mode: 'ask', description: 'Read-only code exploration' },
    { mode: 'plan', description: 'Ask questions and create a plan before implementation' },
];

interface AgentModeSectionProps {
    currentMode: AgentMode | null;
    availableModes: RovoDevModeInfo[];
    setAgentMode: (mode: AgentMode) => void;
}

export const getAgentModeIcon = (mode: string) => {
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

const capitalizeFirst = (s: string): string => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1));

const styles = cssMap({
    sectionWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
    },
    modesContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
    },
    sectionTitle: {
        fontWeight: token('font.weight.semibold', '600'),
        margin: 0,
        marginBottom: token('space.100', '8px'),
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
    const sourceModes = availableModes.length > 0 ? availableModes : DEFAULT_AGENT_MODES;
    const agentModes = sourceModes.filter((mode) => !DISABLED_AGENT_MODES.includes(mode.mode));

    return (
        <Box xcss={styles.sectionWrapper}>
            <Box as="p" xcss={styles.sectionTitle} style={{ fontSize: '12px' }}>
                Reasoning
            </Box>
            <Box xcss={styles.modesContainer}>
                {agentModes.map((modeInfo) => {
                    const isSelected = currentMode === modeInfo.mode;
                    const modeIcon = getAgentModeIcon(modeInfo.mode);

                    return (
                        <Box
                            key={modeInfo.mode}
                            xcss={styles.modeItem}
                            onClick={() => setAgentMode(modeInfo.mode as AgentMode)}
                            style={{
                                backgroundColor: 'var(--vscode-sideBar-background)',
                                borderRadius: '8px',
                            }}
                        >
                            {modeIcon && <Box xcss={styles.modeLogo}>{modeIcon}</Box>}
                            <Box xcss={styles.modeContext}>
                                <Box
                                    as="p"
                                    xcss={styles.labelText}
                                    style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}
                                >
                                    {capitalizeFirst(modeInfo.mode)}
                                </Box>
                                <Box
                                    as="p"
                                    style={{
                                        fontSize: '11px',
                                        margin: `${token('space.050', '4px')} 0 0 0`,
                                    }}
                                >
                                    {capitalizeFirst(modeInfo.description)}
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
