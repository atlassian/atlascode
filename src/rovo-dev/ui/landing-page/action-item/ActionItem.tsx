import './ActionItem.css';

import * as React from 'react';

import { onKeyDownHandler } from '../../utils';

export const ActionItem: React.FC<{
    icon: string | React.ReactNode;
    text: string;
    onClick: () => void;
}> = ({ icon, text, onClick }) => {
    return (
        <div
            className="action-item"
            onClick={onClick}
            onKeyDown={onKeyDownHandler(onClick)}
            tabIndex={0}
            role="button"
            aria-label={text}
        >
            <i className="action-item-icon">{icon}</i>
            <span className="action-item-text">{text}</span>
        </div>
    );
};
