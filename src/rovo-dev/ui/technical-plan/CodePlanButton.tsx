import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

interface CodePlanButtonProps {
    execute: (proceed: boolean) => void;
    disabled?: boolean;
}

export const CodePlanButton: React.FC<CodePlanButtonProps> = ({ execute, disabled = false }) => {
    const [isExecuted, setIsExecuted] = React.useState(false);

    const handleClick = (proceed: boolean) => {
        if (!disabled) {
            execute(proceed);
            setIsExecuted(proceed);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
            <div className="code-plan-button-container">
                <Tooltip content={isExecuted ? 'Code plan executed' : ''}>
                    <button
                        disabled={disabled || isExecuted}
                        className="code-plan-button primary"
                        onClick={() => handleClick(true)}
                    >
                        {isExecuted ? (
                            <CheckCircleIcon label="Code plan executed" />
                        ) : (
                            <AngleBracketsIcon label="Code plan" />
                        )}
                        <span>Generate code</span>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
