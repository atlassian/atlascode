import './PromptContextPopup.css';

import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
import AddIcon from '@atlaskit/icon/core/add';
import CrossIcon from '@atlaskit/icon/core/cross';
import React from 'react';

export interface PromptContextPopupItem {
    label: string;
    description?: string;
    icon: JSX.Element;
    action?: () => void;
}

interface PromptContextPopupProps {
    items: PromptContextPopupItem[];
}

const PromptContextPopup: React.FC<PromptContextPopupProps> = ({ items }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <DropdownMenu
            isOpen={isOpen}
            shouldRenderToParent={true}
            spacing="compact"
            trigger={({ triggerRef, isSelected, testId, ...providedProps }) => (
                <>
                    {isOpen ? (
                        <button
                            {...providedProps}
                            ref={triggerRef}
                            className="prompt-button-secondary-open"
                            aria-label="Prompt context (open)"
                            onClick={() => setIsOpen((prev) => !prev)}
                        >
                            <CrossIcon label="Close" />
                        </button>
                    ) : (
                        <button
                            {...providedProps}
                            ref={triggerRef}
                            className="prompt-button-secondary"
                            aria-label="Prompt context"
                            onClick={() => setIsOpen((prev) => !prev)}
                        >
                            <AddIcon label="Open prompt context" />
                        </button>
                    )}
                </>
            )}
            onOpenChange={(args) => setIsOpen(args.isOpen)}
        >
            <div className="popup-item-container">
                {items.map((item, index) => (
                    <DropdownItem
                        key={index}
                        onClick={() => {
                            item.action?.();
                            setIsOpen(false);
                        }}
                    >
                        <PromptContextPopupItem label={item.label} icon={item.icon} description={item.description} />
                    </DropdownItem>
                ))}
            </div>
        </DropdownMenu>
    );
};

const PromptContextPopupItem: React.FC<{ label: string; icon: JSX.Element; description?: string }> = ({
    label,
    icon,
    description,
}) => {
    return (
        <div className="prompt-context-popup-item">
            <div className="prompt-context-icon">{icon}</div>
            <div className="prompt-context-content">
                <div className="prompt-context-label">{label}</div>
                {description && <div className="prompt-context-description">{description}</div>}
            </div>
        </div>
    );
};
export default PromptContextPopup;
