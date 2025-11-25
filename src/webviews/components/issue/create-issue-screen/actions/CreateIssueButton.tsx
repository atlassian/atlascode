import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import React, { ButtonHTMLAttributes } from 'react';

type CreateIssueButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const CreateIssueButton: React.FC<CreateIssueButtonProps> = (props) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} className="ac-button">
            <button
                style={{
                    border: 'none',
                    padding: '6px 12px',
                    color: 'var(--vscode-button-foreground)',
                    cursor: 'pointer',
                }}
                {...props}
            >
                {props.children}
            </button>
            <div
                style={{
                    width: '1px',
                    height: 'var(--vscode-font-size)',
                    backgroundColor: 'var(--vscode-button-foreground)',
                }}
            />
            <button
                style={{ border: 'none', padding: '4px', color: 'var(--vscode-button-foreground)', cursor: 'pointer' }}
                className="ac-button"
                data-vscode-context='{"webviewSection": "createButton", "preventDefaultContextMenuItems": true}'
                onClick={(e) => {
                    e.preventDefault();
                    e.target.dispatchEvent(
                        new MouseEvent('contextmenu', {
                            bubbles: true,
                            clientX: e.clientX,
                            clientY: e.clientY,
                        }),
                    );
                    e.stopPropagation();
                }}
            >
                <ChevronDownIcon label="Create issue options" size="small" />
            </button>
        </div>
    );
};
