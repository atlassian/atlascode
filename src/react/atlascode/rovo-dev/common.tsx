import Button from '@atlaskit/button';
import CheckIcon from '@atlaskit/icon/glyph/check';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { Marked } from '@ts-stack/markdown';
import { createPatch } from 'diff';
import React, { useCallback } from 'react';
import { RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import {
    agentMessageStyles,
    chatMessageStyles,
    inlineMofidyButtonStyles,
    messageContentStyles,
    toolCallArgsStyles,
    toolReturnListItemStyles,
    undoAcceptButtonStyles,
    userMessageStyles,
} from './rovoDevViewStyles';
import {
    ChatMessage,
    CodeSnippetToChange,
    DefaultMessage,
    parseToolReturnMessage,
    TechnicalPlan,
    TechnicalPlanFileToChange,
    TechnicalPlanLogicalChange,
    ToolCallMessage,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from './utils';

Marked.setOptions({
    sanitize: false,
    breaks: true,
    smartLists: true,
    gfm: true,
});

interface OpenFileFunc {
    (filePath: string, tryShowDiff?: boolean, lineRange?: number[]): void;
}

// TODO unused - should it be cleaned up?
export const ToolDrawer: React.FC<{
    content: ToolReturnGenericMessage[];
    openFile: OpenFileFunc;
    isStreaming?: boolean;
}> = ({ content, openFile, isStreaming = false }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const parsedMessages = content.flatMap((message) => parseToolReturnMessage(message));
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '8px',
            }}
            onClick={() => setIsOpen(!isOpen)}
        >
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '8px',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
                    {isStreaming ? (
                        <i className="codicon codicon-loading codicon-modifier-spin" />
                    ) : (
                        <i className="codicon codicon-tools"></i>
                    )}
                    <div style={{ fontWeight: 'bold' }}>Tool Calls</div>
                    {!isOpen && <div style={{ fontSize: '9px' }}>{`+${parsedMessages.length}`}</div>}
                </div>
                {isOpen ? <i className="codicon codicon-chevron-down" /> : <i className="codicon codicon-chevron-up" />}
            </div>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    gap: '4px',
                }}
            >
                {isOpen &&
                    parsedMessages.map((parsedMsg, index) => {
                        return <ToolReturnParsedItem key={index} msg={parsedMsg} openFile={openFile} />;
                    })}
            </div>
        </div>
    );
};

export const ToolCallItem: React.FC<{ msg: ToolCallMessage }> = ({ msg }) => {
    if (!msg.tool_name || !msg.args) {
        return <div key="invalid-tool-call">Error: Invalid tool call message</div>;
    }

    return (
        <div key="tool-call" style={chatMessageStyles}>
            <div style={toolCallArgsStyles}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="codicon codicon-loading codicon-modifier-spin" />
                    {msg.tool_name}
                </div>
            </div>
        </div>
    );
};

const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
}> = ({ msg, openFile }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={toolReturnListItemStyles}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <a
                onClick={() => msg.filePath && openFile(msg.filePath)}
                style={
                    msg.filePath && isHovered
                        ? {
                              ...toolCallArgsStyles,
                              cursor: 'pointer',
                              backgroundColor: 'var(--vscode-list-hoverBackground)',
                          }
                        : toolCallArgsStyles
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.title && <div style={{ fontWeight: 'bold' }}>{msg.title}</div>}
                </div>
                <div style={{ fontSize: '9px', textAlign: 'right' }}>{msg.content}</div>
            </a>
        </div>
    );
};

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    index?: number;
    openFile: OpenFileFunc;
}> = ({ msg, index, openFile }) => {
    const messageTypeStyles = msg.author.toLowerCase() === 'user' ? userMessageStyles : agentMessageStyles;

    const text = msg.text || '';

    const parts = text.trim().split(/(<TOOL_RETURN>.*<\/TOOL_RETURN>)/g);
    const content = parts.flatMap((part) => {
        try {
            if (part.match(/^<TOOL_RETURN>.*<\/TOOL_RETURN>$/)) {
                const toolReturnContent = part
                    .replace(/^<TOOL_RETURN>/, '')
                    .replace(/<\/TOOL_RETURN>$/, '')
                    .trim();

                const toolReturnMessage: ToolReturnGenericMessage = JSON.parse(toolReturnContent);
                console.log('Parsed Tool Return Message:', toolReturnMessage);
                const parsedMessages = parseToolReturnMessage(toolReturnMessage);
                return parsedMessages.map((message, idx) => (
                    <ToolReturnParsedItem key={idx} msg={message} openFile={openFile} />
                ));
            } else {
                const htmlContent = Marked.parse(part);

                return (
                    <div
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                        key="parsed-content"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                );
            }
        } catch (error) {
            console.error('Error parsing message content:', error);
            return <div key="error-content">Error parsing content</div>;
        }
    });

    return (
        <div key={index} style={{ ...chatMessageStyles, ...messageTypeStyles }}>
            <div style={messageContentStyles}>{content}</div>
        </div>
    );
};

export const renderChatHistory = (
    msg: ChatMessage,
    index: number,
    openFile: OpenFileFunc,
    getText: (fp: string, lr?: number[]) => Promise<string>,
) => {
    switch (msg.author) {
        case 'ToolReturn':
            const parsedMessages = parseToolReturnMessage(msg);
            return parsedMessages.map((message) => {
                if (message.technicalPlan) {
                    return (
                        <TechnicalPlanComponent
                            key={index}
                            content={message.technicalPlan}
                            openFile={openFile}
                            getText={getText}
                        />
                    );
                }
                return <ToolReturnParsedItem key={index} msg={message} openFile={openFile} />;
            });
        case 'RovoDev':
        case 'User':
            return <ChatMessageItem index={index} msg={msg} openFile={openFile} />;
        default:
            return <div key={index}>Unknown message type</div>;
    }
};

export const UpdatedFilesComponent: React.FC<{
    modifiedFiles: ToolReturnParseResult[];
    onUndo: (filePath: string[]) => void;
    onAccept: (filePath: string[]) => void;
    onCreatePR: () => void;
    openDiff: OpenFileFunc;
}> = ({ modifiedFiles, onUndo, onAccept, openDiff, onCreatePR }) => {
    const [isUndoHovered, setIsUndoHovered] = React.useState(false);
    const [isAcceptHovered, setIsAcceptHovered] = React.useState(false);
    const [isPullRequestLoading, setIsPullRequestLoading] = React.useState(false);

    window.addEventListener('message', (event) => {
        if (event.data.type === RovoDevProviderMessageType.CreatePRComplete) {
            setIsPullRequestLoading(false);
        }
    });

    const handleAcceptAll = useCallback(() => {
        const filePaths = modifiedFiles.map((msg) => msg.filePath).filter((path) => path !== undefined);
        onAccept(filePaths);
    }, [onAccept, modifiedFiles]);

    const handleUndoAll = useCallback(() => {
        const filePaths = modifiedFiles.map((msg) => msg.filePath).filter((path) => path !== undefined);
        onUndo(filePaths);
    }, [onUndo, modifiedFiles]);

    if (!modifiedFiles || modifiedFiles.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--vscode-sideBar-background)',
                paddingBottom: '4px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: ' 0 8px',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                    <i className="codicon codicon-source-control" />
                    <span style={{ fontWeight: 'bold' }}>{modifiedFiles.length} Updated file(s)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                    <button
                        style={{
                            color: 'var(--vscode-button-secondaryForeground)',
                            backgroundColor: isUndoHovered
                                ? 'var(--vscode-button-secondaryHoverBackground)'
                                : 'var(--vscode-button-secondaryBackground)',
                            border: '1px solid var(--vscode-button-secondaryBorder)',
                            ...undoAcceptButtonStyles,
                        }}
                        onClick={() => handleUndoAll()}
                        onMouseEnter={() => setIsUndoHovered(true)}
                        onMouseLeave={() => setIsUndoHovered(false)}
                    >
                        Undo
                    </button>
                    <button
                        style={{
                            color: 'var(--vscode-button-foreground)',
                            backgroundColor: isAcceptHovered
                                ? 'var(--vscode-button-hoverBackground)'
                                : 'var(--vscode-button-background)',
                            border: '1px solid var(--vscode-button-border)',
                            ...undoAcceptButtonStyles,
                        }}
                        onClick={() => handleAcceptAll()}
                        onMouseEnter={() => setIsAcceptHovered(true)}
                        onMouseLeave={() => setIsAcceptHovered(false)}
                    >
                        Keep
                    </button>
                    <button
                        style={{
                            color: 'var(--vscode-button-secondaryForeground)',
                            backgroundColor: 'var(--vscode-button-background)',
                            border: '1px solid var(--vscode-button-secondaryBorder)',
                            ...undoAcceptButtonStyles,
                        }}
                        onClick={() => {
                            setIsPullRequestLoading(true);
                            onCreatePR();
                        }}
                        title="Create Pull Request"
                    >
                        {!isPullRequestLoading ? (
                            <i className="codicon codicon-git-pull-request-create" />
                        ) : (
                            <i className="codicon codicon-loading codicon-modifier-spin" />
                        )}
                    </button>
                </div>
            </div>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    overflowY: 'auto',
                    maxHeight: '100px',
                    padding: '4px 8px',
                    borderTop: '1px solid var(--vscode-panel-border)',
                }}
            >
                {modifiedFiles.map((msg, index) => {
                    return (
                        <ModifiedFileItem
                            key={index}
                            msg={msg}
                            onFileClick={(path: string) => openDiff(path, true)}
                            onUndo={(path: string) => onUndo([path])}
                            onAccept={(path: string) => onAccept([path])}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ModifiedFileItem: React.FC<{
    msg: ToolReturnParseResult;
    onUndo: (filePath: string) => void;
    onAccept: (filePath: string) => void;
    onFileClick: (filePath: string) => void;
}> = ({ msg, onUndo, onAccept, onFileClick }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isUndoHovered, setIsUndoHovered] = React.useState(false);
    const [isAcceptHovered, setIsAcceptHovered] = React.useState(false);

    const filePath = msg.filePath;
    if (!filePath) {
        return null;
    }

    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUndo(filePath);
    };

    const handleAccept = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAccept(filePath);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isHovered ? 'var(--vscode-list-hoverBackground)' : 'inherit',
                cursor: 'pointer',
                padding: '2px 8px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                width: '100%',
            }}
            onClick={() => onFileClick(filePath)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div>{filePath}</div>
            <div
                style={{ display: isHovered ? 'flex' : 'none', alignItems: 'center', flexDirection: 'row', gap: '4px' }}
            >
                <Button
                    spacing="none"
                    style={{
                        ...inlineMofidyButtonStyles,
                        color: isUndoHovered
                            ? 'var(--vscode-textLink-foreground) !important'
                            : 'var(--vscode-textForeground) !important',
                    }}
                    onMouseEnter={() => setIsUndoHovered(true)}
                    onMouseLeave={() => setIsUndoHovered(false)}
                    iconBefore={<CrossIcon size="small" label="Close" />}
                    onClick={handleUndo}
                />
                <Button
                    style={{
                        ...inlineMofidyButtonStyles,
                        color: isAcceptHovered
                            ? 'var(--vscode-textLink-foreground) !important'
                            : 'var(--vscode-textForeground) !important',
                    }}
                    onMouseEnter={() => setIsAcceptHovered(true)}
                    onMouseLeave={() => setIsAcceptHovered(false)}
                    spacing="none"
                    iconBefore={<CheckIcon size="small" label="Keep" />}
                    onClick={handleAccept}
                />
            </div>
        </div>
    );
};

type TechnicalPlanProps = {
    content: TechnicalPlan;
    openFile: OpenFileFunc;
    getText: (fp: string, lr?: number[]) => Promise<string>;
};

const TechnicalPlanComponent: React.FC<TechnicalPlanProps> = ({ content, openFile, getText }) => {
    const clarifyingQuestions = content.logicalChanges.flatMap((change) => {
        return change.filesToChange
            .map((file) => {
                if (file.clarifyingQuestionIfAny) {
                    return file.clarifyingQuestionIfAny;
                }
                return null;
            })
            .filter((q) => q !== null);
    });

    return (
        <div>
            <div style={{ ...chatMessageStyles, ...agentMessageStyles }}>
                <div className="technical-plan-container">
                    {content.logicalChanges.map((change, index) => {
                        return (
                            <div className="logical-change-wrapper" key={index}>
                                <div className="logical-change-counter">
                                    <p>{index + 1}</p>
                                </div>
                                <LogicalChange key={index} change={change} openFile={openFile} getText={getText} />
                            </div>
                        );
                    })}
                </div>
            </div>
            {clarifyingQuestions &&
                clarifyingQuestions.length > 0 &&
                clarifyingQuestions.map((question, idx) => {
                    return (
                        <div
                            key={idx}
                            style={{
                                ...chatMessageStyles,
                                ...agentMessageStyles,
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '8px',
                            }}
                        >
                            <QuestionCircleIcon
                                primaryColor="var(--vscode-charts-purple)"
                                size="small"
                                label="Clarifying Question"
                            />
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                                <div>{idx + 1}. </div>
                                <span dangerouslySetInnerHTML={{ __html: Marked.parse(question) }} />
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};

const LogicalChange: React.FC<{
    change: TechnicalPlanLogicalChange;
    openFile: OpenFileFunc;
    getText: (fp: string, lr?: number[]) => Promise<string>;
}> = (props) => {
    const { change, openFile, getText } = props;

    const [isOpen, setIsOpen] = React.useState(false);

    const changeSummary = change.summary;

    const renderFilesToChange = (files: TechnicalPlanFileToChange[]) => {
        if (files.length === 0) {
            return null;
        }
        if (files.length === 1) {
            return (
                <FileToChangeComponent
                    filePath={files[0].filePath}
                    openFile={openFile}
                    getText={getText}
                    descriptionOfChange={files[0].descriptionOfChange}
                    codeSnippetsToChange={files[0].codeSnippetsToChange}
                />
            );
        }

        return files.map((file, index) => {
            return (
                <li>
                    <FileToChangeComponent
                        key={index}
                        filePath={file.filePath}
                        openFile={openFile}
                        getText={getText}
                        descriptionOfChange={file.descriptionOfChange}
                        codeSnippetsToChange={file.codeSnippetsToChange}
                    />
                </li>
            );
        });
    };

    return (
        <div className="logical-change-container">
            <div className="logical-change-header">
                <div className="title">{changeSummary}</div>
                <Button
                    className="chevron-button"
                    appearance="subtle"
                    iconBefore={
                        isOpen ? (
                            <ChevronDownIcon
                                primaryColor="var(--vscode-editor-foreground)"
                                size="medium"
                                label="Collapse"
                            />
                        ) : (
                            <ChevronRightIcon
                                primaryColor="var(--vscode-editor-foreground)"
                                size="medium"
                                label="Expand"
                            />
                        )
                    }
                    onClick={() => setIsOpen(!isOpen)}
                    spacing="none"
                />
            </div>
            {isOpen && <ol className="file-to-change-container">{renderFilesToChange(change.filesToChange)}</ol>}
        </div>
    );
};

const FileToChangeComponent: React.FC<{
    filePath: string;
    openFile: OpenFileFunc;
    getText: (fp: string, lr?: number[]) => Promise<string>;
    descriptionOfChange?: string;
    codeSnippetsToChange?: CodeSnippetToChange[];
}> = ({ filePath, openFile, getText, descriptionOfChange, codeSnippetsToChange }) => {
    const [isCodeChangesOpen, setIsCodeChangesOpen] = React.useState(false);
    const codeSnippetsPresent =
        codeSnippetsToChange && codeSnippetsToChange.length > 0 && codeSnippetsToChange.some((snippet) => snippet.code);

    const renderDescription = (description: string) => {
        return <span dangerouslySetInnerHTML={{ __html: Marked.parse(description) }} />;
    };
    return (
        <div className="file-to-change">
            {descriptionOfChange && renderDescription(descriptionOfChange)}
            <div className="file-to-change-info">
                {codeSnippetsPresent && (
                    <Button
                        className="chevron-button"
                        appearance="subtle"
                        iconBefore={
                            isCodeChangesOpen ? (
                                <ChevronDownIcon
                                    primaryColor="var(--vscode-editor-foreground)"
                                    size="medium"
                                    label="Collapse"
                                />
                            ) : (
                                <ChevronRightIcon
                                    primaryColor="var(--vscode-editor-foreground)"
                                    size="medium"
                                    label="Expand"
                                />
                            )
                        }
                        onClick={() => setIsCodeChangesOpen(!isCodeChangesOpen)}
                        spacing="none"
                    />
                )}
                <div className="lozenge-container">
                    <p>File to modify: </p>
                    <FileLozenge filePath={filePath} openFile={openFile} />
                </div>
            </div>
            {isCodeChangesOpen && codeSnippetsPresent && (
                <div className="code-changes-container">
                    {codeSnippetsToChange.map((snippet, idx) => {
                        if (!snippet.code) {
                            return null;
                        }
                        return (
                            <div key={idx} className="code-snippet">
                                <div>
                                    <span>
                                        Change from line {snippet.startLine} to {snippet.endLine}:
                                    </span>
                                </div>
                                <DiffComponent
                                    key={idx}
                                    filePath={filePath}
                                    code={snippet.code}
                                    lineRange={[snippet.startLine, snippet.endLine + 1]}
                                    getText={getText}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DiffComponent: React.FC<{
    filePath: string;
    code: string;
    lineRange?: number[];
    getText: (fp: string, lr?: number[]) => Promise<string>;
}> = ({ filePath, code, lineRange, getText }) => {
    const [diff, setDiff] = React.useState<string>('');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string>('');
    const [isDone, setIsDone] = React.useState(false);

    React.useEffect(() => {
        const codeBlocks = document.querySelectorAll('pre code');

        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [diff, isDone]);

    React.useEffect(() => {
        if (isDone) {
            return;
        }
        const loadDiff = async () => {
            try {
                setLoading(true);
                setError('');
                const oldCode = await getText(filePath, lineRange);
                if (!oldCode) {
                    setDiff(code); // If no old code is found, just show the new code
                    setLoading(false);
                    setIsDone(true);
                    return;
                }
                const diffResult = createPatch(filePath, oldCode, code, undefined, undefined, {
                    ignoreWhitespace: true,
                });

                const lines = diffResult.split('\n');
                // Skip the first 4 lines of the diff header
                const diffContent = lines
                    .slice(4)
                    .filter((line) => !line.includes('No newline at end of file'))
                    .join('\n');
                setDiff(diffContent);
            } catch (err) {
                console.error('Error loading diff:', err);
                setError('Error loading diff');
            } finally {
                setLoading(false);
                setIsDone(true);
            }
        };

        loadDiff();
    }, [filePath, code, lineRange, getText, isDone]);

    if (loading) {
        return (
            <div style={{ padding: '8px', color: 'var(--vscode-descriptionForeground)' }}>
                <i className="codicon codicon-loading codicon-modifier-spin" />
                <span style={{ marginLeft: '8px' }}>Loading diff...</span>
            </div>
        );
    }

    if (error) {
        return <div style={{ padding: '8px', color: 'var(--vscode-errorForeground)' }}>{error}</div>;
    }

    return (
        <pre>
            <code>{diff}</code>
        </pre>
    );
};

const FileLozenge: React.FC<{ filePath: string; openFile: OpenFileFunc }> = ({ filePath, openFile }) => {
    const fileTitle = filePath ? filePath.match(/([^/\\]+)$/)?.[0] : undefined;

    return (
        <div onClick={() => openFile(filePath)} className="file-lozenge">
            <span className="file-path">{fileTitle || filePath}</span>
        </div>
    );
};
