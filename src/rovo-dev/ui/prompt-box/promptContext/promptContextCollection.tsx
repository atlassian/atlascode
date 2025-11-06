import React from 'react';
import { RovoDevContextItem, RovoDevFileContext, RovoDevJiraContext } from 'src/rovo-dev/rovoDevTypes';

import { OpenFileFunc, OpenJiraFunc } from '../../common/common';
import { PromptContextFileItem, PromptContextJiraItem } from './promptContextItem';

// PromptContextCollection: displays a row or column of PromptContextItem
export const PromptContextCollection: React.FC<{
    content: RovoDevContextItem[];
    direction?: 'row' | 'column';
    align?: 'left' | 'right';
    onToggleActiveItem?: (enabled: boolean) => void;
    readonly?: boolean;
    onRemoveContext?: (item: RovoDevContextItem) => void;
    inChat?: boolean;
    openFile: OpenFileFunc;
    openJira: OpenJiraFunc;
}> = ({
    content,
    direction = 'row',
    align = 'left',
    onToggleActiveItem,
    readonly = true,
    onRemoveContext,
    inChat,
    openFile,
    openJira,
}) => {
    if (content.length === 0) {
        return null;
    }

    const focusedItem = content.find((x) => x.contextType === 'file' && x.isFocus) as RovoDevFileContext | undefined;
    const fileItems = content.filter((x) => x.contextType === 'file' && !x.isFocus) as RovoDevFileContext[];
    const jiraItems = content.filter((x) => x.contextType === 'jiraWorkItem') as RovoDevJiraContext[];

    const flexDirection = direction === 'column' ? 'column' : 'row';
    const justifyContent = align === 'right' ? 'flex-end' : 'flex-start';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection,
                flexWrap: 'wrap',
                alignItems: direction === 'row' ? 'center' : 'flex-end',
                justifyContent,
                gap: direction === 'column' ? 1 : 4,
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: inChat ? '8px' : 0,
            }}
        >
            {/* Disabled for now in favor of the larger button outside the collection */}
            {/* {!readonly && <AddContextButton onClick={onAddContext} />} */}
            {!!focusedItem && (
                <PromptContextFileItem
                    isFocus={focusedItem.isFocus}
                    file={focusedItem.file}
                    selection={focusedItem.selection}
                    enabled={focusedItem.enabled}
                    onToggle={onToggleActiveItem}
                    openFile={openFile}
                />
            )}
            {fileItems.map((item, index) => (
                <PromptContextFileItem
                    key={index}
                    isFocus={item.isFocus}
                    file={item.file}
                    selection={item.selection}
                    enabled={item.enabled}
                    onRemove={!readonly && onRemoveContext ? () => onRemoveContext(item) : undefined}
                    openFile={openFile}
                />
            ))}
            {jiraItems.map((item, index) => (
                <PromptContextJiraItem
                    key={index}
                    name={item.name}
                    url={item.url}
                    onRemove={!readonly && onRemoveContext ? () => onRemoveContext(item) : undefined}
                    openJira={openJira}
                />
            ))}
        </div>
    );
};
