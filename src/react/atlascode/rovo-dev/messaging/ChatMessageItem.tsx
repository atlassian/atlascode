import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CopyIcon from '@atlaskit/icon/core/copy';
import ThumbsDownIcon from '@atlaskit/icon/core/thumbs-down';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import Tooltip from '@atlaskit/tooltip';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { RovoDevTextResponse } from 'src/rovo-dev/responseParserInterfaces';

import { MarkedDown, OpenFileFunc } from '../common/common';
import { PromptContextCollection } from '../prompt-box/promptContext/promptContextCollection';
import { UserPromptMessage } from '../utils';

// Streaming text component for smooth character-by-character display
const StreamingText: React.FC<{
    content: string;
    isStreaming: boolean;
    streamingSpeed?: number;
    onStreamingComplete?: () => void;
}> = ({ content, isStreaming, streamingSpeed = 80, onStreamingComplete }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isInternalStreaming, setIsInternalStreaming] = useState(false);
    const animationRef = useRef<number | null>(null);
    const lastContentRef = useRef('');
    
    useEffect(() => {
        if (content !== lastContentRef.current && content.length > displayedContent.length) {
            lastContentRef.current = content;
            
            if (isStreaming) {
                setIsInternalStreaming(true);
                animateStreaming();
            } else {
                setDisplayedContent(content);
            }
        }
    }, [content, isStreaming, displayedContent.length]);
    
    const animateStreaming = () => {
        const startTime = Date.now();
        const startLength = displayedContent.length;
        const targetContent = content;
        const totalCharsToAdd = targetContent.length - startLength;
        
        if (totalCharsToAdd <= 0) {
            setIsInternalStreaming(false);
            onStreamingComplete?.();
            return;
        }
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const charsToShow = Math.min(
                startLength + Math.floor((elapsed / 1000) * streamingSpeed),
                targetContent.length
            );
            
            const newDisplayedContent = targetContent.substring(0, charsToShow);
            setDisplayedContent(newDisplayedContent);
            
            if (charsToShow < targetContent.length) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setIsInternalStreaming(false);
                onStreamingComplete?.();
            }
        };
        
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
    };
    
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);
    
    return (
        <div style={{ position: 'relative' }}>
            <MarkedDown value={displayedContent} />
            {isInternalStreaming && (
                <span 
                    style={{ 
                        animation: 'streaming-cursor-blink 1s infinite',
                        marginLeft: '2px',
                        fontSize: '1.2em',
                        color: 'var(--vscode-editor-foreground)'
                    }}
                >
                    |
                </span>
            )}
        </div>
    );
};

export const ChatMessageItem: React.FC<{
    msg: UserPromptMessage | RovoDevTextResponse;
    icon?: React.ReactNode;
    enableActions?: boolean;
    onCopy?: (text: string) => void;
    onFeedback?: (isPositive: boolean) => void;
    openFile?: OpenFileFunc;
    isStreaming?: boolean;
}> = ({ msg, icon, enableActions, onCopy, onFeedback, openFile, isStreaming = false }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [streamingComplete, setStreamingComplete] = useState(!isStreaming);
    const messageTypeStyles = msg.event_kind === '_RovoDevUserPrompt' ? 'user-message' : 'agent-message';

    const handleCopyClick = useCallback(() => {
        if (onCopy && msg.content) {
            onCopy(msg.content);
            setIsCopied(true);
            // Reset the copied state and remove the check icon after 2 seconds
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }
    }, [onCopy, msg.content]);

    const handleStreamingComplete = useCallback(() => {
        setStreamingComplete(true);
    }, []);

    return (
        <>
            <div
                className={`chat-message ${messageTypeStyles}`}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', gap: '8px' }}
            >
                {icon && <div className="message-icon">{icon}</div>}
                <div className="message-content">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {msg.event_kind === 'text' && isStreaming ? (
                            <StreamingText
                                content={msg.content || ''}
                                isStreaming={isStreaming}
                                onStreamingComplete={handleStreamingComplete}
                            />
                        ) : (
                            <MarkedDown value={msg.content || ''} />
                        )}
                    </div>
                </div>
            </div>
            {msg.event_kind === '_RovoDevUserPrompt' && msg.context && (
                <div className="message-context">
                    <PromptContextCollection
                        content={msg.context}
                        direction="column"
                        align="right"
                        inChat={true}
                        openFile={openFile}
                    />
                </div>
            )}
            {msg.event_kind === 'text' && enableActions && streamingComplete && (
                <div className="chat-message-actions">
                    <Tooltip content="Helpful">
                        <button
                            onClick={() => onFeedback?.(true)}
                            aria-label="like-response-button"
                            className="chat-message-action"
                        >
                            <ThumbsUpIcon label="thumbs-up" spacing="none" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Unhelpful">
                        <button
                            onClick={() => onFeedback?.(false)}
                            aria-label="dislike-response-button"
                            className="chat-message-action"
                        >
                            <ThumbsDownIcon label="thumbs-down" spacing="none" />
                        </button>
                    </Tooltip>
                    <Tooltip key={isCopied ? 'copied' : 'copy'} content={isCopied ? 'Copied!' : 'Copy response'}>
                        <button
                            aria-label="copy-button"
                            className={`chat-message-action copy-button ${isCopied ? 'copied' : ''}`}
                            onClick={handleCopyClick}
                        >
                            {isCopied ? (
                                <CheckCircleIcon label="Copied!" spacing="none" />
                            ) : (
                                <CopyIcon label="Copy button" spacing="none" />
                            )}
                        </button>
                    </Tooltip>
                </div>
            )}
        </>
    );
};
