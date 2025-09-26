import './ActionItem.css';

import * as React from 'react';

export const ActionItem: React.FC<{
    icon: string | React.ReactNode;
    text: string;
    onClick: () => void;
}> = ({ icon, text, onClick }) => {
    return (
        <div className="action-item" onClick={onClick}>
            <i className="action-item-icon">{icon}</i>
            <span className="action-item-text">{text}</span>
        </div>
    );
};
