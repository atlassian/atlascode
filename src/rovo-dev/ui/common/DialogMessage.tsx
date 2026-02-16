import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CopyIcon from '@atlaskit/icon/core/copy';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import StatusErrorIcon from '@atlaskit/icon/core/status-error';
import StatusInfoIcon from '@atlaskit/icon/core/status-information';
import StatusWarningIcon from '@atlaskit/icon/core/status-warning';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';
import { RovoDevToolName } from 'src/rovo-dev/client';
import { ToolPermissionChoice } from 'src/rovo-dev/client';

import {
    chatMessageStyles,
    errorMessageStyles,
    inChatButtonStyles,
    inChatSecondaryButtonStyles,
    messageContentStyles,
} from '../rovoDevViewStyles';
import { DialogMessage } from '../utils';
import { MarkedDown } from './common';
import { ExpandableSection } from './ExpandableSection';

export const DialogMessageItem: React.FC<{
    msg: DialogMessage;
    isRetryAfterErrorButtonEnabled?: (uid: string) => boolean;
    retryAfterError?: () => void;
    onToolPermissionChoice?: (toolCallId: string, choice: ToolPermissionChoice) => void;
    customButton?: { text: string; onClick?: () => void };
    onOpenLogFile?: () => void;
    onLinkClick: (href: string) => void;
    onRestartProcess?: () => void;
}> = ({
    msg,
    isRetryAfterErrorButtonEnabled,
    retryAfterError,
    onToolPermissionChoice,
    customButton,
    onOpenLogFile,
    onLinkClick,
    onRestartProcess,
}) => {
    const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);
    const [isStackTraceExpanded, setIsStackTraceExpanded] = React.useState(false);
    const [isStderrExpanded, setIsStderrExpanded] = React.useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);

    const copyToClipboard = () => {
        const parts = [];
        parts.push(`${msg.title || 'Error'}`);
        if (msg.text) {
            parts.push(`\n${msg.text}`);
        }
        if (msg.statusCode) {
            parts.push(`\n${msg.statusCode}`);
        }
        if (msg.stackTrace) {
            parts.push(`\n\nExtension Stack Trace:\n${msg.stackTrace}`);
        }
        if (msg.stderr) {
            parts.push(`\n\nRovo Dev Stderr:\n${msg.stderr}`);
        }
        if (msg.rovoDevLogs && msg.rovoDevLogs.length > 0) {
            parts.push(`\n\nRovo Dev Logs:\n${msg.rovoDevLogs.join('\n')}`);
        }
        navigator.clipboard.writeText(parts.join(''));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    const [title, icon] = React.useMemo(() => {
        let title: string;
        let icon: React.JSX.Element;

        switch (msg.type) {
            case 'error':
                title = msg.title ?? 'Rovo Dev encountered an error';
                icon = <ErrorIcon title={title} />;
                return [title, icon];
            case 'warning':
                title = msg.title ?? 'Rovo Dev';
                icon = <WarningIcon title={title} />;
                return [title, icon];
            case 'info':
                title = msg.title ?? 'Rovo Dev';
                icon = <InfoIcon title={title} />;
                return [title, icon];
            case 'toolPermissionRequest':
                title = msg.title ?? 'Permission required';
                icon = <WarningIcon title={title} />;
                return [title, icon];
            default:
                // @ts-expect-error ts(2339) - `msg` here should be 'never'
                return [msg.title, <></>];
        }
    }, [msg.type, msg.title]);

    return (
        <div style={{ ...chatMessageStyles, ...errorMessageStyles }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                {icon}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingTop: '2px',
                        paddingLeft: '2px',
                        width: 'calc(100% - 24px)',
                        overflowWrap: 'break-word',
                    }}
                >
                    <div style={messageContentStyles}>{title}</div>

                    {msg.text && (
                        <div style={messageContentStyles}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <MarkedDown value={msg.text ?? ''} onLinkClick={onLinkClick} />
                            </div>
                        </div>
                    )}

                    {msg.type === 'toolPermissionRequest' && (
                        <ToolCall toolName={msg.toolName} toolArgs={msg.toolArgs} mcpServer={msg.mcpServer} />
                    )}

                    {msg.type === 'error' &&
                        msg.isRetriable &&
                        retryAfterError &&
                        isRetryAfterErrorButtonEnabled?.(msg.uid) && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    width: '100%',
                                    marginTop: '8px',
                                }}
                            >
                                <button style={inChatButtonStyles} onClick={retryAfterError}>
                                    Try again
                                </button>
                            </div>
                        )}

                    {msg.type === 'error' && msg.isProcessTerminated && onRestartProcess && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                width: '100%',
                                marginTop: '8px',
                            }}
                        >
                            <button style={inChatButtonStyles} onClick={onRestartProcess}>
                                Restart Process
                            </button>
                        </div>
                    )}

                    {msg.type === 'toolPermissionRequest' && onToolPermissionChoice && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                width: '100%',
                                marginTop: '8px',
                                gap: '8px',
                            }}
                        >
                            <button
                                style={inChatButtonStyles}
                                onClick={() => onToolPermissionChoice(msg.toolCallId, 'allow')}
                            >
                                Allow
                            </button>
                            <button
                                style={inChatSecondaryButtonStyles}
                                onClick={() => onToolPermissionChoice(msg.toolCallId, 'deny')}
                            >
                                Deny
                            </button>
                        </div>
                    )}

                    {customButton && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginTop: '8px' }}>
                            <button style={inChatButtonStyles} onClick={customButton.onClick}>
                                {customButton.text}
                            </button>
                        </div>
                    )}

                    {msg.statusCode && <div style={{ fontSize: 'smaller', textAlign: 'right' }}>{msg.statusCode}</div>}

                    {(msg.stackTrace || msg.stderr || (msg.rovoDevLogs && msg.rovoDevLogs.length > 0)) && (
                        <ExpandableSection
                            title="Details"
                            isExpanded={isDetailsExpanded}
                            onToggle={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        >
                            <div style={{ marginLeft: '20px' }}>
                                {msg.stackTrace && (
                                    <ExpandableSection
                                        title="Extension Stack Trace"
                                        isExpanded={isStackTraceExpanded}
                                        onToggle={() => setIsStackTraceExpanded(!isStackTraceExpanded)}
                                    >
                                        {msg.stackTrace}
                                    </ExpandableSection>
                                )}

                                {msg.stderr && (
                                    <ExpandableSection
                                        title="Rovo Dev Stderr"
                                        isExpanded={isStderrExpanded}
                                        onToggle={() => setIsStderrExpanded(!isStderrExpanded)}
                                    >
                                        {msg.stderr}
                                    </ExpandableSection>
                                )}

                                {msg.rovoDevLogs && msg.rovoDevLogs.length > 0 && (
                                    <ExpandableSection
                                        title="Rovo Dev Logs"
                                        isExpanded={isLogsExpanded}
                                        onToggle={() => setIsLogsExpanded(!isLogsExpanded)}
                                        headerActions={
                                            onOpenLogFile && (
                                                <Tooltip content="Open log file in editor">
                                                    <button
                                                        aria-label="open-log-file-button"
                                                        className="chat-message-action"
                                                        onClick={onOpenLogFile}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            color: 'var(--vscode-foreground)',
                                                        }}
                                                    >
                                                        <LinkExternalIcon label="Open log file" spacing="none" />
                                                    </button>
                                                </Tooltip>
                                            )
                                        }
                                    >
                                        {msg.rovoDevLogs.join('\n')}
                                    </ExpandableSection>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        width: '100%',
                                        marginTop: '12px',
                                    }}
                                >
                                    <Tooltip
                                        key={isCopied ? 'copied' : 'copy'}
                                        content={isCopied ? 'Copied!' : 'Copy to clipboard'}
                                    >
                                        <button
                                            aria-label="copy-details-button"
                                            className={`chat-message-action copy-button ${isCopied ? 'copied' : ''}`}
                                            onClick={copyToClipboard}
                                        >
                                            {isCopied ? (
                                                <CheckCircleIcon label="Copied!" spacing="none" />
                                            ) : (
                                                <CopyIcon label="Copy to clipboard" spacing="none" />
                                            )}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </ExpandableSection>
                    )}
                </div>
            </div>
        </div>
    );
};

const ErrorIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorError-foreground)' }}>
        <StatusErrorIcon label={title} />
    </div>
);

const WarningIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorWarning-foreground)' }}>
        <StatusWarningIcon label={title} />
    </div>
);

const InfoIcon: React.FC<{
    title: string;
}> = ({ title }) => (
    <div style={{ padding: '4px', color: 'var(--vscode-editorInfo-foreground)' }}>
        <StatusInfoIcon label={title} />
    </div>
);

const fileListStyles: React.CSSProperties = {
    margin: '0',
    paddingLeft: '20px',
    overflow: 'hidden',
};

const friendlyToolName: Record<RovoDevToolName, string> = {
    create_file: 'Create file',
    delete_file: 'Delete file',
    move_file: 'Move file',
    find_and_replace_code: 'Find and replace code',
    open_files: 'Read files',
    expand_code_chunks: 'Expand chunks of code',
    expand_folder: 'Expand folder',
    grep: 'Search for',
    bash: 'Run command',
    create_technical_plan: 'Create a technical plan',
    mcp_invoke_tool: "Invoke an MCP server's tool",
    mcp__atlassian__invoke_tool: "Invoke an Atlassian MCP server's tool",
    mcp__atlassian__get_tool_schema: "Get an Atlassian MCP server's tool schema",
    mcp__scout__invoke_tool: "Invoke an MCP server's tool",
};

const ToolCall: React.FC<{
    toolName: RovoDevToolName;
    toolArgs: string;
    mcpServer?: string;
}> = ({ toolName, toolArgs, mcpServer }) => {
    const jsonArgs = React.useMemo(() => {
        try {
            return toolArgs ? JSON.parse(toolArgs) : {};
        } catch {
            return {};
        }
    }, [toolArgs]);

    const toolFriendlyName = React.useMemo(() => friendlyToolName[toolName] ?? toolName, [toolName]);

    return (
        <div>
            <div style={{ fontWeight: '600' }}>{toolFriendlyName}</div>
            <ToolCallBody toolName={toolName} jsonArgs={jsonArgs} toolArgs={toolArgs} mcpServer={mcpServer} />
        </div>
    );
};

const ToolCallBody: React.FC<{
    toolName: string;
    jsonArgs: any;
    toolArgs: string;
    mcpServer?: string;
}> = ({ toolName, jsonArgs, toolArgs, mcpServer }) => {
    if (toolName === 'bash') {
        return (
            <pre style={{ margin: '0' }}>
                <code style={{ maxWidth: '100%' }}>{jsonArgs.command}</code>
            </pre>
        );
    } else if (toolName === 'grep') {
        return <code style={{ maxWidth: '100%' }}>{jsonArgs.content_pattern}</code>;
    } else if (toolName === 'create_technical_plan') {
        return null;
    } else if (toolName === 'mcp_invoke_tool') {
        return (
            <table style={{ border: '0' }}>
                <tr>
                    <td style={{ paddingLeft: '8px' }}>Server:</td>
                    <td style={{ paddingLeft: '8px' }}>{mcpServer}</td>
                </tr>
                <tr>
                    <td style={{ paddingLeft: '8px' }}>Tool:</td>
                    <td style={{ paddingLeft: '8px' }}>{jsonArgs.tool_name}</td>
                </tr>
            </table>
        );
    } else if (Array.isArray(jsonArgs.file_paths)) {
        return (
            <ul style={fileListStyles}>
                {jsonArgs.file_paths.map((file: string) => (
                    <li>{file}</li>
                ))}
            </ul>
        );
    } else if (jsonArgs.file_path && Array.isArray(jsonArgs.line_ranges)) {
        return (
            <ul style={fileListStyles}>
                {Array.isArray(jsonArgs.line_ranges) &&
                    jsonArgs.line_ranges.map((range: [number, number]) =>
                        range[0] >= 0 && range[1] > 0 ? (
                            <li>
                                {jsonArgs.file_path}:[{range[0]}-{range[1]}]
                            </li>
                        ) : (
                            <li>{jsonArgs.file_path}</li>
                        ),
                    )}
            </ul>
        );
    } else if (jsonArgs.file_path) {
        return (
            <ul style={fileListStyles}>
                <li>{jsonArgs.file_path}</li>
            </ul>
        );
    } else {
        return <div>{toolArgs}</div>;
    }
};
