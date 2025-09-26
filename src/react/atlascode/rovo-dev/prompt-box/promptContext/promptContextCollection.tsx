import React from 'react';
import { RovoDevContextItem } from 'src/rovo-dev/rovoDevTypes';

import { PromptContextItem } from './promptContextItem';

// PromptContextCollection: displays a row or column of PromptContextItem
export const PromptContextCollection: React.FC<{
    content: RovoDevContextItem[];
    direction?: 'row' | 'column';
    align?: 'left' | 'right';
    onToggleActiveItem?: (enabled: boolean) => void;
    readonly?: boolean;
    onRemoveContext?: (item: RovoDevContextItem) => void;
    inChat?: boolean;
}> = ({ content, direction = 'row', align = 'left', onToggleActiveItem, readonly = true, onRemoveContext, inChat }) => {
    if (content.length === 0) {
        return null;
    }

    const focusedItem = content.find((x) => x.isFocus);
    const addedItems = content.filter((x) => !x.isFocus);

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
                <PromptContextItem
                    isFocus={focusedItem.isFocus}
                    file={focusedItem.file}
                    selection={focusedItem.selection}
                    enabled={focusedItem.enabled}
                    onToggle={onToggleActiveItem}
                />
            )}
            {addedItems.map((item, index) => (
                <PromptContextItem
                    key={index}
                    isFocus={item.isFocus}
                    file={item.file}
                    selection={item.selection}
                    enabled={item.enabled}
                    onRemove={!readonly && onRemoveContext ? () => onRemoveContext(item) : undefined}
                />
            ))}
        </div>
    );
};
