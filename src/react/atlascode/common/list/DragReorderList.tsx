import { Divider, List, ListItem, ListItemIcon, RootRef } from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import React, { memo, useCallback, useEffect } from 'react';
import {
    DragDropContext,
    Draggable,
    DraggingStyle,
    Droppable,
    DropResult,
    NotDraggingStyle,
} from 'react-beautiful-dnd';
import { uid } from 'react-uid';

type DragReorderListProps = {
    disabled?: boolean;
    onReorder?: (oldIndex: number, newIndex: number) => void;
    listItems: React.ReactElement[];
    dragIcon?: React.ReactElement;
};

const reorder = (listItems: React.ReactElement[], startIndex: number, endIndex: number): React.ReactElement[] => {
    const result = [...listItems];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

const getItemStyle = (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined) => ({
    // styles we need to apply on draggables
    ...draggableStyle,

    ...(isDragging && {
        opacity: '0.5',
    }),
});

type DraggableListItemProps = {
    item: React.ReactElement;
    index: number;
    dragIcon: React.ReactElement;
    divider: boolean;
};

const DraggableListItem: React.FunctionComponent<DraggableListItemProps> = memo(
    ({ item, index, dragIcon, divider }) => {
        const did = uid(`draggable-${item.key}`);

        const childFunc = useCallback(
            (provided, snapshot) => {
                return (
                    <React.Fragment>
                        <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                        >
                            <ListItemIcon {...provided.dragHandleProps}>{dragIcon}</ListItemIcon>
                            {item}
                        </ListItem>
                        {divider && <Divider />}
                    </React.Fragment>
                );
            },
            [divider, dragIcon, item],
        );

        return (
            <Draggable draggableId={did} index={index}>
                {childFunc}
            </Draggable>
        );
    },
);

export const DragReorderList: React.FunctionComponent<DragReorderListProps> = ({
    disabled,
    onReorder,
    listItems,
    dragIcon,
}): JSX.Element => {
    const [items, setItems] = React.useState(listItems);
    const [indexes, setIndexes] = React.useState({ old: -1, new: -1 });
    const [isDirty, setIsDirty] = React.useState(false);
    const dragHandle = dragIcon ? dragIcon : <DragIndicatorIcon color="disabled" />;

    const onDragEnd = useCallback((result: DropResult) => {
        setItems((oldItems) => {
            // dropped outside the list
            if (!result.destination || result.source.index === result.destination.index) {
                return oldItems;
            }
            setIndexes({ old: result.source.index, new: result.destination.index });
            setIsDirty(true);
            return reorder(oldItems, result.source.index, result.destination.index);
        });
    }, []);

    useEffect(() => {
        if (onReorder && isDirty) {
            onReorder(indexes.old, indexes.new);
            setIsDirty(false);
        }

        if (!isDirty) {
            setItems(listItems);
        }
    }, [isDirty, indexes, onReorder, listItems]);

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable">
                {(provided) => (
                    <RootRef rootRef={provided.innerRef}>
                        <List>
                            {items.map((item, index) => {
                                const key = item.key !== null ? item.key : uid(`${item.key}`);
                                return (
                                    <DraggableListItem
                                        key={key}
                                        item={item}
                                        index={index}
                                        dragIcon={dragHandle}
                                        divider={items.length !== index + 1}
                                    />
                                );
                            })}
                            {provided.placeholder}
                        </List>
                    </RootRef>
                )}
            </Droppable>
        </DragDropContext>
    );
};
