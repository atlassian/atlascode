import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CopyIcon from '@atlaskit/icon/core/copy';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import Tooltip from '@atlaskit/tooltip';
import MarkdownIt from 'markdown-it';
import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { ToDoList } from '../tools/ToDoList';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, onKeyDownHandler, parseToolReturnMessage } from '../utils';
import { DialogMessageItem } from './DialogMessage';

// Context for error reporting in RovoDev
export const RovoDevErrorContext = React.createContext<{
    reportError?: (error: Error, component: string) => void;
}>({});

const mdParser = new MarkdownIt({
    html: false,
    breaks: true,
    typographer: true,
    linkify: true,
});

mdParser.linkify.set({ fuzzyLink: false });

mdParser.validateLink = (url) => /^(https?):/i.test(url);

mdParser.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    if (hrefIndex >= 0) {
        const hrefAttr = token.attrs ? token.attrs[hrefIndex] : null;
        if (hrefAttr && hrefAttr[1]) {
            const hrefValue = hrefAttr[1];
            if (Array.isArray(token.attrs)) {
                token.attrs!.splice(hrefIndex, 1);
            } else {
                throw new Error(
                    `Token attrs is not an array. Actual value: ${token.attrs} with type ${typeof token.attrs}`,
                );
            }
            token.attrSet('data-href', hrefValue);
            token.attrSet('class', 'rovodev-markdown-link');
        }
    }
    return self.renderToken(tokens, idx, options);
};

// Copy button component for code blocks
const CodeBlockCopyButton: React.FC<{ codeText: string; onCopy: (text: string) => void }> = ({ codeText, onCopy }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyClick = useCallback(() => {
        onCopy(codeText);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    }, [onCopy, codeText]);

    return (
        <Tooltip key={isCopied ? 'copied' : 'copy'} content={isCopied ? 'Copied!' : 'Copy code'}>
            <button
                aria-label="copy-code-button"
                className={`code-copy-button ${isCopied ? 'copied' : ''}`}
                onClick={handleCopyClick}
            >
                {isCopied ? (
                    <CheckCircleIcon label="Copied!" spacing="none" />
                ) : (
                    <CopyIcon label="Copy code" spacing="none" />
                )}
            </button>
        </Tooltip>
    );
};

export const MarkedDown: React.FC<{
    value: string;
    onLinkClick: (href: string) => void;
    onCopy?: (text: string) => void;
}> = ({ value, onLinkClick, onCopy }) => {
    const spanRef = React.useRef<HTMLSpanElement>(null);
    const { reportError } = React.useContext(RovoDevErrorContext);

    const html = React.useMemo(() => {
        try {
            // Ensure value is always a string to prevent "Input data should be a String" errors
            const stringValue =
                value !== null && value !== undefined && typeof value !== 'string' ? String(value) : (value ?? '');
            return mdParser.render(stringValue);
        } catch (error) {
            // If markdown parsing fails, report error to backend and return plain text
            console.error('Markdown parsing error:', error);

            // Report to telemetry if reportError is available
            if (reportError && error instanceof Error) {
                reportError(error, 'MarkedDown');
            }

            // Fallback to plain text instead of crashing
            const stringValue =
                value !== null && value !== undefined && typeof value !== 'string' ? String(value) : (value ?? '');
            return stringValue;
        }
    }, [value, reportError]);

    React.useEffect(() => {
        if (!spanRef.current) {
            return;
        }

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && onLinkClick) {
                const href = target.getAttribute('data-href');
                if (href) {
                    event.preventDefault();
                    event.stopPropagation();
                    onLinkClick(href);
                }
            }
        };

        // Add copy buttons to code blocks
        const roots: Map<HTMLElement, ReactDOM.Root> = new Map();
        if (onCopy) {
            const preElements = spanRef.current.querySelectorAll('pre');

            preElements.forEach((pre) => {
                // Skip if already has a copy button
                if (pre.parentElement?.classList.contains('code-block-wrapper')) {
                    return;
                }

                // Detect single-line code blocks by checking if the content has no newlines
                const codeEl = pre.querySelector('code');
                const codeText = (codeEl ?? pre).textContent || '';
                const isInline = !codeText.includes('\n') || codeText.trim().split('\n').length === 1;

                // Create wrapper
                const wrapper = document.createElement('div');
                wrapper.className = `code-block-wrapper${isInline ? ' code-block-wrapper-inline' : ''}`;

                // Create container for the copy button
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'code-copy-button-container';

                // Wrap the pre element
                pre.parentNode?.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
                wrapper.appendChild(buttonContainer);

                // Get the code text and render the button
                const root = ReactDOM.createRoot(buttonContainer);
                root.render(<CodeBlockCopyButton codeText={codeText} onCopy={onCopy} />);
                roots.set(buttonContainer, root);
            });
        }

        const currentSpan = spanRef.current;
        currentSpan.addEventListener('click', handleClick);
        return () => {
            currentSpan.removeEventListener('click', handleClick);
            // Cleanup React roots
            roots.forEach((root) => {
                root.unmount();
            });
        };
    }, [onLinkClick, onCopy, html]);

    // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- necessary to apply MarkDown formatting
    return <span ref={spanRef} dangerouslySetInnerHTML={{ __html: html }} />;
};

export interface OpenFileFunc {
    (filePath: string, tryShowDiff?: boolean, lineRange?: number[]): void;
}

export interface OpenJiraFunc {
    (url: string): void;
}

export type CheckFileExistsFunc = (filePath: string) => boolean | null;

export const renderChatHistory = (
    msg: ChatMessage,
    openFile: OpenFileFunc,
    openJira: OpenJiraFunc,
    onLinkClick: (link: string) => void,
    checkFileExists: CheckFileExistsFunc,
    isRetryAfterErrorButtonEnabled: (uid: string) => boolean,
    retryAfterError: () => void,
    onError: (error: Error, errorMessage: string) => void,
) => {
    switch (msg.event_kind) {
        case 'tool-return':
            const parsedMessages = parseToolReturnMessage(msg, onError);
            return parsedMessages.map((message, index) => {
                if (message.todoData) {
                    return <ToDoList key={index} todos={message.todoData} />;
                }
                return <ToolReturnParsedItem key={index} msg={message} openFile={openFile} onLinkClick={onLinkClick} />;
            });
        case '_RovoDevDialog':
            let customButton: { text: string; onClick: () => void } | undefined = undefined;
            if (msg.ctaLink) {
                const { text, link } = msg.ctaLink;
                customButton = {
                    text,
                    onClick: () => onLinkClick(link),
                };
            }

            return (
                <DialogMessageItem
                    msg={msg}
                    isRetryAfterErrorButtonEnabled={isRetryAfterErrorButtonEnabled}
                    retryAfterError={retryAfterError}
                    onToolPermissionChoice={
                        () => {} /* this codepath is not supposed to have tool permissions requests */
                    }
                    customButton={customButton}
                    onLinkClick={onLinkClick}
                />
            );
        case 'text':
        case '_RovoDevUserPrompt':
        case '_RovoDevExitPlanMode':
            return <ChatMessageItem msg={msg} openFile={openFile} openJira={openJira} onLinkClick={onLinkClick} />;
        case 'retry-prompt':
            return (
                <ChatMessageItem
                    icon={<CrossCircleIcon label="Retry prompt" size="small" />}
                    msg={{ event_kind: 'text', content: msg.content, index: -1 }}
                    openFile={openFile}
                    openJira={openJira}
                    onLinkClick={onLinkClick}
                />
            );
        default:
            return <div>Unknown message type</div>;
    }
};

export const FileLozenge: React.FC<{
    filePath: string;
    openFile?: OpenFileFunc;
    isDisabled?: boolean;
}> = ({ filePath, openFile, isDisabled }) => {
    const fileTitle = filePath ? filePath.match(/([^/\\]+)$/)?.[0] : undefined;

    const handleClick = () => {
        if (!isDisabled && openFile) {
            openFile(filePath);
        }
    };

    return (
        <div
            onClick={handleClick}
            onKeyDown={!isDisabled && openFile ? onKeyDownHandler(() => openFile(filePath)) : undefined}
            tabIndex={isDisabled ? -1 : 0}
            role="button"
            aria-label={`Open file: ${filePath}`}
            aria-disabled={isDisabled}
            className={isDisabled ? 'file-lozenge file-lozenge-disabled' : 'file-lozenge'}
        >
            <span className="file-path">{fileTitle || filePath}</span>
        </div>
    );
};
