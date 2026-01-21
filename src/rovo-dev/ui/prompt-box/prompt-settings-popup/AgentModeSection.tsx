import { Radio } from '@atlaskit/radio';
import React from 'react';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client';

interface AgentModeSectionProps {
    currentMode: AgentMode | null;
    availableModes: RovoDevModeInfo[];
    setAgentMode: (mode: AgentMode) => void;
}

// Map agent modes to icons - using similar icons as other settings
const getModeIcon = (mode: string) => {
    // You'll need to import appropriate icons from @atlaskit/icon
    // For now using placeholders - replace with actual Atlaskit icons
    switch (mode) {
        case 'default':
            // Could use something like SettingsIcon or similar
            return null; // Replace with actual icon
        case 'plan':
            // Could use AiGenerativeTextSummaryIcon or similar
            return null; // Replace with actual icon
        case 'ask':
            // Could use QuestionCircleIcon or similar
            return null; // Replace with actual icon
        default:
            return null;
    }
};

// Format mode label for display
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
        <div style={{ marginTop: '8px' }}>
            <h3
                style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--vscode-descriptionForeground)',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}
            >
                Reasoning
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableModes.map((modeInfo) => {
                    const isSelected = currentMode === modeInfo.mode;
                    const modeIcon = getModeIcon(modeInfo.mode);

                    return (
                        <div
                            key={modeInfo.mode}
                            className="prompt-settings-item"
                            onClick={() => handleModeSelect(modeInfo.mode as AgentMode)}
                            style={{ cursor: 'pointer' }}
                        >
                            {modeIcon && <div className="prompt-settings-logo">{modeIcon}</div>}
                            <div id="prompt-settings-context" style={{ flex: 1 }}>
                                <p style={{ fontWeight: 'bold', margin: 0 }}>{formatModeLabel(modeInfo.mode)}</p>
                                <p
                                    style={{
                                        fontSize: '11px',
                                        margin: '4px 0 0 0',
                                        color: 'var(--vscode-descriptionForeground)',
                                    }}
                                >
                                    {modeInfo.description}
                                </p>
                            </div>
                            <div className="prompt-settings-action">
                                <Radio
                                    isChecked={isSelected}
                                    onChange={() => handleModeSelect(modeInfo.mode as AgentMode)}
                                    value={modeInfo.mode}
                                    name="agentMode"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgentModeSection;
