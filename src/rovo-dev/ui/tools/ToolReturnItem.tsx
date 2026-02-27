import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import DeleteIcon from '@atlaskit/icon/core/delete';
import FileIcon from '@atlaskit/icon/core/file';
import SearchIcon from '@atlaskit/icon/core/search';
import React from 'react';

import { MarkedDown, OpenFileFunc } from '../common/common';
import { ToolReturnParseResult } from '../utils';

export const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
    onLinkClick: (href: string) => void;
}> = ({ msg, openFile, onLinkClick }) => {
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
