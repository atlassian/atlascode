import React from 'react';

/**
 * A hook that supports both controlled and uncontrolled "open" state for popups.
 *
 * When `controlledIsOpen` / `onOpenChange` are provided, the hook operates in controlled
 * mode and defers state ownership to the parent. This allows a parent to coordinate multiple
 * popups so that only one can be open at a time.
 *
 * When they are omitted, the hook falls back to managing its own internal state, so components
 * can still be used standalone (e.g. in tests).
 */
export function useControllableOpen(
    controlledIsOpen?: boolean,
    onOpenChange?: (isOpen: boolean) => void,
): [boolean, (next: boolean) => void] {
    const isControlled = controlledIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = React.useState(false);

    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const setIsOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) {
                setInternalIsOpen(next);
            }
            onOpenChange?.(next);
        },
        [isControlled, onOpenChange],
    );

    return [isOpen, setIsOpen];
}
