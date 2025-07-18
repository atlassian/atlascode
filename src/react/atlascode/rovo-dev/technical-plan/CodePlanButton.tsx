import React from 'react';

interface CodePlanButtonProps {
    execute: () => void;
}

export const CodePlanButton: React.FC<CodePlanButtonProps> = ({ execute }) => {
    return (
        <div className="code-plan-button-container">
            <button className="code-plan-button" onClick={() => execute()}>
                <span>Code plan</span>
            </button>
        </div>
    );
};
