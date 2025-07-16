import CodeIcon from '@atlaskit/icon/glyph/code';
import FileIcon from '@atlaskit/icon/glyph/file';
import SearchIcon from '@atlaskit/icon/glyph/search';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import React from 'react';

import { OpenFileFunc } from '../common/common';
import { ToolReturnParseResult } from '../utils';

export const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
}> = ({ msg, openFile }) => {
    const toolIcon = msg.type ? iconMap[msg.type] : undefined;
    return (
        <a className="tool-return-item" onClick={() => msg.filePath && openFile(msg.filePath)}>
            {toolIcon && <>{toolIcon}</>}
            {msg.content}
            {msg.title && <div className="tool-return-path">{msg.title}</div>}
        </a>
    );
};

const iconMap: Record<string, React.JSX.Element> = {
    modify: <CodeIcon label="Modified file" size="small" />,
    create: <FileIcon label="Opened file" size="small" />,
    delete: <TrashIcon label="Deleted file" size="small" />,
    open: <SearchIcon label="Opened file" size="small" />,
};
