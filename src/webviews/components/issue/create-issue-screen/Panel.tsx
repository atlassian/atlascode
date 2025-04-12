import React, { useState } from 'react';

interface PanelProps {
    isDefaultExpanded: boolean;
    header: React.ReactNode;
    children: React.ReactNode;
}

const ChevronClosed = (
    <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
        <path
            d="M10.294 9.698a.988.988 0 010-1.407 1.01 1.01 0 011.419 0l2.965 2.94a1.09 1.09 0 010 1.548l-2.955 2.93a1.01 1.01 0 01-1.42 0 .988.988 0 010-1.407l2.318-2.297-2.327-2.307z"
            fill="currentColor"
            fill-rule="evenodd"
        ></path>
    </svg>
);

const ChevronOpen = (
    <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
        <path
            d="M8.292 10.293a1.009 1.009 0 000 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 000-1.419.987.987 0 00-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 00-1.406 0z"
            fill="currentColor"
            fill-rule="evenodd"
        ></path>
    </svg>
);

export const Panel: React.FC<PanelProps> = ({ isDefaultExpanded, header, children }) => {
    const [isExpanded, setIsExpanded] = useState(isDefaultExpanded);

    const togglePanel = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div style={{ marginTop: '16px', marginBottom: '36px' }}>
            <div
                onClick={togglePanel}
                style={{
                    display: 'flex',
                    position: 'relative',
                    left: '-24px',
                    alignItems: 'center',
                    padding: '2px 0 2px 24px',
                    width: '100%',
                }}
            >
                <span style={{ position: 'absolute', top: 0, left: 0 }}>
                    {isExpanded ? ChevronOpen : ChevronClosed}
                </span>
                <span>{header}</span>
            </div>
            {isExpanded && children}
        </div>
    );
};
