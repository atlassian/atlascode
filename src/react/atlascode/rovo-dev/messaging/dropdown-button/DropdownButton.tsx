import './DropdownButton.css';

import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
import React from 'react';

interface DropdownButtonItem {
    label: string;
    onSelect: () => void;
}
interface DropdownButtonProps {
    buttonItem: DropdownButtonItem;
    items?: DropdownButtonItem[];
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({ buttonItem, items }) => {
    return (
        <div className="dropdown-button-container">
            <div className="dropdown-button">
                <button
                    aria-label="Main action"
                    className="dropdown-button-trigger"
                    style={{ borderRadius: '4px 0 0 4px' }}
                    onClick={buttonItem.onSelect}
                >
                    {buttonItem.label}
                </button>
                {items && items.length > 0 && (
                    <>
                        <div className="dropdown-button-separator" />
                        <DropdownMenu
                            trigger={({ triggerRef, isSelected, testId, ...providedProps }) => (
                                <button
                                    aria-label="More actions"
                                    className="dropdown-button-trigger"
                                    style={{ padding: '6px 4px', borderRadius: '0 4px 4px 0' }}
                                    type="button"
                                    {...providedProps}
                                    ref={triggerRef}
                                >
                                    <i className="codicon codicon-chevron-down" />
                                </button>
                            )}
                            spacing="compact"
                        >
                            <div className="dropdown-item-container">
                                {items.map((item, index) => (
                                    <DropdownItem key={index} onClick={item.onSelect}>
                                        <span style={{ color: 'var(--vscode-editor-foreground)' }}>{item.label}</span>
                                    </DropdownItem>
                                ))}
                            </div>
                        </DropdownMenu>
                    </>
                )}
            </div>
        </div>
    );
};
