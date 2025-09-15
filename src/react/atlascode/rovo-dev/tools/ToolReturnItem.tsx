import CodeIcon from '@atlaskit/icon/glyph/code';
import FileIcon from '@atlaskit/icon/glyph/file';
import SearchIcon from '@atlaskit/icon/glyph/search';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import React from 'react';

import { mdParser, OpenFileFunc } from '../common/common';
import { ToolReturnParseResult } from '../utils';

export const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
}> = ({ msg, openFile }) => {
    const toolIcon = msg.type ? iconMap[msg.type] : undefined;
    const content = mdParser.renderInline(msg.content);
    return (
        <a
            className={`tool-return-item-base tool-return-item ${msg.filePath ? 'tool-return-file-path' : ''}`}
            onClick={() => msg.filePath && openFile(msg.filePath)}
        >
            {toolIcon && <>{toolIcon}</>}
            <div className="tool-return-item-base" style={{ flexWrap: 'wrap' }}>
                <div className="tool-return-content" dangerouslySetInnerHTML={{ __html: content }} />
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
    modify: <CodeIcon label="Modified file" size="small" />,
    create: <FileIcon label="Opened file" size="small" />,
    delete: <TrashIcon label="Deleted file" size="small" />,
    open: <SearchIcon label="Opened file" size="small" />,
    bash: <CodeIcon label="Bash command" size="small" />,
};
