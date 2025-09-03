import { IconButton } from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import React, { useState } from 'react';

interface PanelProps {
    isDefaultExpanded: boolean;
    header: React.ReactNode;
    children: React.ReactNode;
}

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
                    cursor: 'pointer',
                    gap: '6px',
                }}
            >
                <IconButton
                    icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                    appearance="subtle"
                    spacing="compact"
                    label={`${isExpanded ? 'Collapse' : 'Expand'} panel`}
                    aria-expanded={isExpanded}
                    aria-describedby="panel-header"
                />
                <span id="panel-header">{header}</span>
            </div>
            {isExpanded && children}
        </div>
    );
};
