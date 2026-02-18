import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import MarkdownIt from 'markdown-it';
import React from 'react';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, onKeyDownHandler, parseToolReturnMessage } from '../utils';
import { DialogMessageItem } from './DialogMessage';

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

export const MarkedDown: React.FC<{ value: string; onLinkClick: (href: string) => void }> = ({
    value,
    onLinkClick,
}) => {
    const spanRef = React.useRef<HTMLSpanElement>(null);
    const html = React.useMemo(() => mdParser.render(value ?? ''), [value]);

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

        const currentSpan = spanRef.current;
        currentSpan.addEventListener('click', handleClick);
        return () => {
            currentSpan.removeEventListener('click', handleClick);
        };
    }, [onLinkClick]);

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

export const FollowUpActionFooter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start',
                marginTop: '8px',
                marginBottom: '8px',
            }}
        >
            {children}
        </div>
    );
};

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
            return parsedMessages.map((message) => {
                if (message.technicalPlan) {
                    return (
                        <TechnicalPlanComponent
                            content={message.technicalPlan}
                            openFile={openFile}
                            onLinkClick={onLinkClick}
                            checkFileExists={checkFileExists}
                        />
                    );
                }
                return <ToolReturnParsedItem msg={message} openFile={openFile} onLinkClick={onLinkClick} />;
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
