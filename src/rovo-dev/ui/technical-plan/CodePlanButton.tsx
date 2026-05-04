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
        <div className="code-plan-button-container">
            <Tooltip content={disabled ? '' : isExecuted ? 'Code plan executed' : 'Execute generated plan'}>
                <button
                    disabled={disabled || isExecuted}
                    className="code-plan-button"
                    onClick={() => handleClick(true)}
                >
                    <span>Generate code</span>
                </button>
            </Tooltip>
        </div>
    );
};
