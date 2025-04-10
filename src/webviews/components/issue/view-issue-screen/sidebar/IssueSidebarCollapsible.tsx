import Button from '@atlaskit/button';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronUpIcon from '@atlaskit/icon/glyph/chevron-up';
import { Box } from '@material-ui/core';
import React from 'react';
export type SidebarItem = {
    itemLabel?: string;
    itemComponent: React.ReactNode;
};

type Props = {
    label: string;
    items: SidebarItem[];
    defaultOpen?: boolean;
};

const CollapsibleButton = ({
    label,
    isOpen,
    toggleOpen,
}: {
    label: string;
    isOpen: boolean;
    toggleOpen: () => void;
}) => {
    const borderRadius = isOpen ? '3px 3px 0 0' : '3px';

    const [isHovered, setIsHovered] = React.useState(false);
    const border = isHovered
        ? '1px solid var(--vscode-list-focusOutline)'
        : '1px solid var(--vscode-editorGroup-border)';
    return (
        <Button
            style={{
                display: 'flex',
                width: '100%',
                background: 'var(--vscode-editor-background)',
                alignItems: 'center',
                color: 'var(--vscode-editor-foreground)',
                border: border,
                padding: '12px',
                borderRadius: borderRadius,
                height: '36px',
            }}
            onMouseOver={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={toggleOpen}
            iconAfter={
                isOpen ? (
                    <ChevronDownIcon label="Collapse" size="medium" />
                ) : (
                    <ChevronUpIcon label="Expand" size="medium" />
                )
            }
        >
            <Box
                className="ac-field-label"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    width: '100%',
                }}
            >
                {label}
            </Box>
        </Button>
    );
};
export const IssueSidebarCollapsible: React.FC<Props> = ({ label, items, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <CollapsibleButton label={label} isOpen={isOpen} toggleOpen={toggleOpen} />
            {isOpen && (
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '12px',
                        border: '1px solid var(--vscode-editorGroup-border)',
                        borderTop: 0,
                        borderRadius: '0 0 3px 3px',
                    }}
                >
                    {items.map((item, index) => (
                        <Box
                            key={index}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '30%',
                                    textAlign: 'left',
                                    color: 'var(--vscode-panelTitle-inactiveForeground',
                                }}
                            >
                                {item.itemLabel}
                            </div>
                            <Box style={{ width: '100%', overflow: 'hidden' }}>{item.itemComponent}</Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};
