import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

interface CodePlanButtonProps {
    execute: (proceed: boolean) => void;
    disabled?: boolean;
}

export const CodePlanButton: React.FC<CodePlanButtonProps> = ({ execute, disabled = false }) => {
    const [isExecuted, setIsExecuted] = React.useState(false);
    const [isCancelled, setIsCancelled] = React.useState(false);

    const handleClick = (proceed: boolean) => {
        if (!disabled) {
            execute(proceed);
            setIsExecuted(proceed);
            setIsCancelled(!proceed);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
            <div className="code-plan-button-container">
                <Tooltip content={isExecuted ? 'Code plan executed' : isCancelled ? '' : 'Execute generated code plan'}>
                    <button
                        disabled={disabled || isExecuted || isCancelled}
                        className="code-plan-button primary"
                        onClick={() => handleClick(true)}
                    >
                        {isExecuted ? (
                            <CheckCircleIcon label="Code plan executed" />
                        ) : isCancelled ? (
                            <CrossCircleIcon label="Code plan cancelled" />
                        ) : (
                            <AngleBracketsIcon label="Code plan" />
                        )}
                        <span>Generate code</span>
                    </button>
                </Tooltip>
            </div>
            <div className="code-plan-button-container">
                <Tooltip content={isCancelled || isExecuted ? '' : 'Cancel code plan generation'}>
                    <button
                        disabled={disabled || isExecuted || isCancelled}
                        className="code-plan-button secondary"
                        onClick={() => handleClick(false)}
                    >
                        <span>Cancel</span>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
