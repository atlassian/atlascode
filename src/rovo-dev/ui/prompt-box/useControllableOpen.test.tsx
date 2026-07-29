import { act, renderHook } from '@testing-library/react';

import { useControllableOpen } from './useControllableOpen';

describe('useControllableOpen', () => {
    it('manages its own state when uncontrolled', () => {
        const { result } = renderHook(() => useControllableOpen());

        expect(result.current[0]).toBe(false);

        act(() => result.current[1](true));
        expect(result.current[0]).toBe(true);

        act(() => result.current[1](false));
        expect(result.current[0]).toBe(false);
    });

    it('reflects the controlled value and does not manage internal state', () => {
        const onOpenChange = jest.fn();
        const { result, rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => useControllableOpen(isOpen, onOpenChange),
            { initialProps: { isOpen: false } },
        );

        expect(result.current[0]).toBe(false);

        // Requesting open should not change the displayed value on its own (parent owns state)...
        act(() => result.current[1](true));
        expect(onOpenChange).toHaveBeenCalledWith(true);
        expect(result.current[0]).toBe(false);

        // ...only when the parent updates the prop does the value change.
        rerender({ isOpen: true });
        expect(result.current[0]).toBe(true);
    });

    it('still notifies onOpenChange when uncontrolled', () => {
        const onOpenChange = jest.fn();
        const { result } = renderHook(() => useControllableOpen(undefined, onOpenChange));

        act(() => result.current[1](true));
        expect(onOpenChange).toHaveBeenCalledWith(true);
        expect(result.current[0]).toBe(true);
    });
});
