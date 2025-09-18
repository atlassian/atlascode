import React from 'react';

interface CodePlanButtonProps {
    execute: () => void;
    disabled?: boolean;
}

export const CodePlanButton: React.FC<CodePlanButtonProps> = ({ execute, disabled = false }) => {
    return (
        <div className="code-plan-button-container">
            <button disabled={disabled} className="code-plan-button" onClick={() => execute()}>
                <span>Generate code</span>
            </button>
        </div>
    );
};
