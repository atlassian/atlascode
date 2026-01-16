import './ActionItem.css';

import * as React from 'react';

export const ActionItem: React.FC<{
    icon: string | React.ReactNode;
    text: string;
    onClick: () => void;
}> = ({ icon, text, onClick }) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            className="action-item"
            onClick={onClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={text}
        >
            <i className="action-item-icon">{icon}</i>
            <span className="action-item-text">{text}</span>
        </div>
    );
};
