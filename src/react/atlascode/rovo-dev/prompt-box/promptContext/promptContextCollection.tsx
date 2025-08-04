import React from 'react';
import { RovoDevContext, RovoDevContextItem } from 'src/rovo-dev/rovoDevTypes';

import { PromptContextItem } from './promptContextItem';

// PromptContextCollection: displays a row or column of PromptContextItem
export const PromptContextCollection: React.FC<{
    content: RovoDevContext;
    direction?: 'row' | 'column';
    align?: 'left' | 'right';
    onToggleActiveItem?: (enabled: boolean) => void;
    readonly?: boolean;
    onRemoveContext?: (item: RovoDevContextItem) => void;
}> = ({ content, direction = 'row', align = 'left', onToggleActiveItem, readonly = true, onRemoveContext }) => {
    if (content.focusInfo?.invalid && !content.contextItems?.length) {
        return null;
    }

    const flexDirection = direction === 'column' ? 'column' : 'row';
    const justifyContent = align === 'right' ? 'flex-end' : 'flex-start';
    const showFocusInfo = onToggleActiveItem !== undefined || content.focusInfo?.enabled;

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
            }}
        >
            {/* Disabled for now in favor of the larger button outside the collection */}
            {/* {!readonly && <AddContextButton onClick={onAddContext} />} */}
            {content.focusInfo && !content.focusInfo.invalid && showFocusInfo && (
                <PromptContextItem
                    file={content.focusInfo.file}
                    selection={content.focusInfo.selection}
                    enabled={content.focusInfo.enabled}
                    onToggle={onToggleActiveItem}
                />
            )}
            {content.contextItems &&
                content.contextItems.length > 0 &&
                content.contextItems.map((item, index) => (
                    <PromptContextItem
                        key={index}
                        file={item.file}
                        selection={item.selection}
                        onRemove={!readonly && onRemoveContext ? () => onRemoveContext(item) : undefined}
                    />
                ))}
        </div>
    );
};
