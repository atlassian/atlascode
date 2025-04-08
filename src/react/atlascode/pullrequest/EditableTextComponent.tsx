import { IconButton, makeStyles, Tooltip } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import React, { useCallback, useRef, useState } from 'react';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        alignItems: 'flex-start',
        flex: 1,
        minWidth: 0,
    },
    textContent: {
        flex: 1,
        minWidth: 0,
        padding: '4px',
        cursor: 'text',
        lineHeight: '20px',
        color: 'var(--vscode-editor-foreground)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        '&:hover': {
            border: '1px solid var(--vscode-input-border)',
            padding: '3px',
        },
        '&:focus': {
            outline: 'none',
            border: '1px solid var(--vscode-focusBorder)',
            padding: '3px',
        },
    },
    closeButton: {
        padding: 4,
        marginLeft: 4,
        marginTop: 3,
    },
    disabled: {
        cursor: 'default',
        opacity: 0.7,
    },
});

interface EditableTextComponentProps {
    initialContent?: string;
    placeholder?: string;
    onSave: (content: string) => Promise<void>;
    onCancel?: () => void;
    onFocus?: () => void;
    className?: string;
    showCancelButton?: boolean;
    disabled?: boolean;
}

export const EditableTextComponent: React.FC<EditableTextComponentProps> = ({
    initialContent = '',
    placeholder,
    onSave,
    onCancel,
    onFocus,
    className = '',
    showCancelButton = true,
    disabled = false,
}) => {
    const classes = useStyles();
    const [isEditing, setIsEditing] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    const handleBlur = useCallback(
        async (e: React.FocusEvent) => {
            if (e.relatedTarget && (e.relatedTarget as HTMLElement).classList.contains(classes.closeButton)) {
                return;
            }
            const content = textRef.current?.textContent || '';
            if (content.trim()) {
                await onSave(content);
                if (textRef.current && !initialContent) {
                    textRef.current.textContent = '';
                }
            }
            setIsEditing(false);
        },
        [onSave, classes.closeButton, initialContent],
    );

    const handleCancel = useCallback(() => {
        if (textRef.current) {
            textRef.current.textContent = initialContent;
            textRef.current.blur();
        }
        setIsEditing(false);
        onCancel?.();
    }, [initialContent, onCancel]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textRef.current?.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleFocus = useCallback(() => {
        if (!disabled) {
            setIsEditing(true);
            onFocus?.();
        }
    }, [disabled, onFocus]);

    return (
        <div className={`${classes.container}`}>
            <div
                ref={textRef}
                className={`${classes.textContent} ${className} ${disabled ? classes.disabled : ''}`}
                contentEditable={!disabled}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                data-placeholder={placeholder}
            >
                {initialContent}
            </div>
            {isEditing && showCancelButton && (
                <Tooltip title="Cancel (Esc)">
                    <IconButton size="small" onClick={handleCancel} className={classes.closeButton}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </div>
    );
};
