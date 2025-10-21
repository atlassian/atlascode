import MarkdownIt from 'markdown-it';
import React from 'react';

import { ChatMessageItem } from '../messaging/ChatMessageItem';
import { TechnicalPlanComponent } from '../technical-plan/TechnicalPlanComponent';
import { ToolReturnParsedItem } from '../tools/ToolReturnItem';
import { ChatMessage, parseToolReturnMessage } from '../utils';
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

            token.attrs!.splice(hrefIndex, 1);
            token.attrSet('data-href', hrefValue);
            token.attrSet(
                'style',
                'cursor: pointer; color: var(--vscode-textLink-foreground); text-decoration: underline;',
            );
        }
    }
    return self.renderToken(tokens, idx, options);
};

export const decodeUriComponentSafely = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const strictEncodeUrl = (url: string) => {
    const decoded = decodeUriComponentSafely(url);
    const encoded = encodeURI(decoded);

    return encoded.replace(/\(/g, '%28').replace(/\)/g, '%29');
};

// Normalizes URLs before Markdown rendering:
// 1) Encodes the entire Atlassian JQL query (everything after "jql=" to end of line)
// so spaces, commas, and parentheses don't break the link.
// 2) Strict-encodes any http/https URL (encodeURI + () -> %28/%29) to prevent
// linkify from truncating at closing parentheses.
// Keep validateLink to allow only http/https.
export const normalizeLinks = (messageText: string) => {
    let processed = messageText.replace(
        /(https?:\/\/[^\s]+\/issues\/\?jql=)(.*?)(?=$|\n|\r)/gi,
        (_match, prefix: string, jqlTail: string) => prefix + encodeURIComponent(decodeUriComponentSafely(jqlTail)),
    );

    processed = processed.replace(/https?:\/\/[^\n\r]+/g, (rawUrl) => strictEncodeUrl(rawUrl));

    return processed;
};

export const MarkedDown: React.FC<{ value: string; onLinkClick?: (href: string) => void }> = ({
    value,
    onLinkClick,
}) => {
    const spanRef = React.useRef<HTMLSpanElement>(null);
    const html = React.useMemo(() => mdParser.render(normalizeLinks(value)), [value]);

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
                justifyContent: 'flex-end',
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
    checkFileExists: CheckFileExistsFunc,
    isRetryAfterErrorButtonEnabled: (uid: string) => boolean,
    retryAfterError: () => void,
) => {
    switch (msg.event_kind) {
        case 'tool-return':
            const parsedMessages = parseToolReturnMessage(msg);
            return parsedMessages.map((message) => {
                if (message.technicalPlan) {
                    return (
                        <TechnicalPlanComponent
                            content={message.technicalPlan}
                            openFile={openFile}
                            checkFileExists={checkFileExists}
                        />
                    );
                }
                return <ToolReturnParsedItem msg={message} openFile={openFile} />;
            });
        case '_RovoDevDialog':
            return (
                <DialogMessageItem
                    msg={msg}
                    isRetryAfterErrorButtonEnabled={isRetryAfterErrorButtonEnabled}
                    retryAfterError={retryAfterError}
                    onToolPermissionChoice={
                        () => {} /* this codepath is not supposed to have tool permissions requests */
                    }
                />
            );
        case 'text':
        case '_RovoDevUserPrompt':
            return <ChatMessageItem msg={msg} openFile={openFile} openJira={openJira} />;
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
        <div onClick={handleClick} className={isDisabled ? 'file-lozenge file-lozenge-disabled' : 'file-lozenge'}>
            <span className="file-path">{fileTitle || filePath}</span>
        </div>
    );
};
