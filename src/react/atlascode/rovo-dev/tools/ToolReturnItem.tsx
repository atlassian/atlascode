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
}> = ({ msg, openFile }) => {
    const toolIcon = msg.type ? iconMap[msg.type] : undefined;

    return (
        <a
            className={`tool-return-item-base tool-return-item ${msg.filePath ? 'tool-return-file-path' : ''}`}
            onClick={() => msg.filePath && openFile(msg.filePath)}
        >
            {toolIcon}
            <div className="tool-return-item-base" style={{ flexWrap: 'wrap' }}>
                <div className="tool-return-content">
                    <MarkedDown value={msg.content} />
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
