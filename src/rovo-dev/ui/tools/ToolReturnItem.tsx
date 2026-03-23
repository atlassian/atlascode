import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import DeleteIcon from '@atlaskit/icon/core/delete';
import FileIcon from '@atlaskit/icon/core/file';
import SearchIcon from '@atlaskit/icon/core/search';
import React from 'react';

import { MarkedDown, OpenFileFunc } from '../common/common';
import { ToolReturnParseResult } from '../utils';
import { ToDoList } from './ToDoList';

/** Compute a simple +N -N diff stat from a unified diff string */
function computeDiffStat(diff: string): { added: number; removed: number } {
    let added = 0;
    let removed = 0;
    for (const line of diff.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            added++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            removed++;
        }
    }
    return { added, removed };
}

/** Pill for "Replaced code" tool returns — shows filename, diff stat, copy & expand buttons */
const ReplaceCodePill: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
}> = ({ msg, openFile }) => {
    const [expanded, setExpanded] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const diffStat = React.useMemo(
        () => (msg.diff ? computeDiffStat(msg.diff) : null),
        [msg.diff],
    );

    const handleOpenFile = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (msg.filePath) {
                openFile(msg.filePath);
            }
        },
        [msg.filePath, openFile],
    );

    const handleCopy = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (msg.diff && navigator.clipboard) {
                navigator.clipboard.writeText(msg.diff).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                });
            }
        },
        [msg.diff],
    );

    const handleToggleExpand = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((prev) => !prev);
        },
        [],
    );

    return (
        <div className="tool-return-item-base tool-return-item tool-return-replace-code">
            {/* Header row: icon + filename + diffstat + action buttons */}
            <div className="tool-return-replace-code-header">
                <a
                    className="tool-return-replace-code-filelabel tool-return-file-path"
                    onClick={handleOpenFile}
                    title={msg.filePath}
                >
                    <AngleBracketsIcon label="Modified file" />
                    <span className="tool-return-replace-code-filename">{msg.title ?? msg.filePath}</span>
                    {diffStat && (
                        <span className="tool-return-replace-code-diffstat">
                            <span className="diffstat-added">+{diffStat.added}</span>
                            <span className="diffstat-removed">-{diffStat.removed}</span>
                        </span>
                    )}
                </a>
                <div className="tool-return-replace-code-actions">
                    {msg.diff && (
                        <>
                            <button
                                className="tool-return-icon-btn"
                                title={copied ? 'Copied!' : 'Copy diff'}
                                onClick={handleCopy}
                            >
                                <i className={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`} />
                            </button>
                            <button
                                className="tool-return-icon-btn"
                                title={expanded ? 'Collapse diff' : 'Expand diff'}
                                onClick={handleToggleExpand}
                            >
                                <i className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            {/* Expandable diff viewer */}
            {expanded && msg.diff && (
                <div className="tool-return-diff-viewer">
                    <pre>
                        <code className="tool-return-diff-code">{msg.diff}</code>
                    </pre>
                </div>
            )}
        </div>
    );
};

/** Pill for grouped "Opened file" tool returns */
export const GroupedOpenFilePill: React.FC<{
    msgs: ToolReturnParseResult[];
    openFile: OpenFileFunc;
}> = ({ msgs, openFile }) => {
    const [expanded, setExpanded] = React.useState(false);

    if (msgs.length === 1) {
        return <ToolReturnParsedItem msg={msgs[0]} openFile={openFile} onLinkClick={() => {}} />;
    }

    return (
        <div className="tool-return-item-base tool-return-item tool-return-group">
            <div className="tool-return-group-header">
                <SearchIcon label="Opened files" />
                <span className="tool-return-group-label">Opened {msgs.length} files</span>
                <button
                    className="tool-return-icon-btn"
                    title={expanded ? 'Collapse' : 'Expand'}
                    onClick={(e) => {
                        e.preventDefault();
                        setExpanded((prev) => !prev);
                    }}
                >
                    <i className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`} />
                </button>
            </div>
            {expanded && (
                <div className="tool-return-group-files">
                    {msgs.map((msg, i) => (
                        <a
                            key={i}
                            className="tool-return-group-file tool-return-file-path"
                            onClick={(e) => {
                                e.preventDefault();
                                if (msg.filePath) {
                                    openFile(msg.filePath);
                                }
                            }}
                            title={msg.filePath}
                        >
                            <FileIcon label="File" />
                            <span>{msg.title ?? msg.filePath}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
    onLinkClick: (href: string) => void;
}> = ({ msg, openFile, onLinkClick }) => {
    // "Replaced code" gets a dedicated pill with diff stat + copy + expand
    if (msg.content === 'Replaced code' && msg.type === 'modify') {
        return <ReplaceCodePill msg={msg} openFile={openFile} />;
    }

    const toolIcon = React.useMemo(() => (msg.type ? iconMap[msg.type] : undefined), [msg.type]);

    const filePathClass = msg.filePath && msg.type !== 'delete' ? 'tool-return-file-path' : '';

    const handleOpenFile = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (msg.filePath && msg.type !== 'delete') {
                openFile(msg.filePath);
            }
        },
        [msg.filePath, msg.type, openFile],
    );

    return (
        <a className={`tool-return-item-base tool-return-item ${filePathClass}`} onClick={handleOpenFile}>
            {toolIcon}
            <div className="tool-return-item-base" style={{ flexWrap: 'wrap' }}>
                <div className="tool-return-content">
                    <MarkedDown value={msg.content ?? ''} onLinkClick={onLinkClick} />
                </div>
                {renderTitle(msg)}
                {msg.todoData && msg.todoData.length > 0 && <ToDoList todos={msg.todoData} />}
            </div>
        </a>
    );
};

const renderTitle = (msg: ToolReturnParseResult) => {
    if (msg.title) {
        if (msg.type === 'bash') {
            return (
                <div className="tool-return-bash-command">
                    <pre>
                        <code>{msg.title}</code>
                    </pre>
                </div>
            );
        }
        return <div className="tool-return-path">{msg.title}</div>;
    }
    return null;
};

const iconMap: Record<string, React.JSX.Element> = {
    modify: <AngleBracketsIcon label="Modified file" />,
    create: <FileIcon label="Opened file" />,
    delete: <DeleteIcon label="Deleted file" />,
    open: <SearchIcon label="Opened file" />,
    bash: <AngleBracketsIcon label="Bash command" />,
};
