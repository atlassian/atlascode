import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import React from 'react';

export interface ExpandableSectionProps {
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    marginTop?: string;
}

const toggleButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--vscode-descriptionForeground)',
    cursor: 'pointer',
    padding: '0',
    fontSize: 'inherit',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
};

const contentContainerStyles: React.CSSProperties = {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '4px',
    fontSize: 'smaller',
    fontFamily: 'var(--vscode-editor-font-family)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflowY: 'auto',
};

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
    title,
    isExpanded,
    onToggle,
    children,
    headerActions,
    marginTop = '8px',
}) => {
    return (
        <div style={{ marginTop }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <button style={toggleButtonStyles} onClick={onToggle}>
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                        {isExpanded ? (
                            <ChevronDownIcon label="" spacing="none" />
                        ) : (
                            <ChevronRightIcon label="" spacing="none" />
                        )}
                    </span>
                    {title}
                </button>
                {headerActions}
            </div>
            {isExpanded && <div style={contentContainerStyles}>{children}</div>}
        </div>
    );
};
