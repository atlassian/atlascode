/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { EditorType } from '../EditorStateContext';
import { useEditorForceClose } from './useEditorForceClose';

describe('useEditorForceClose', () => {
    let mockOnForceClose: jest.Mock;
    let addEventListenerSpy: jest.SpyInstance;
    let removeEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        mockOnForceClose = jest.fn();
        addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        jest.clearAllMocks();
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    describe('when isAtlaskitEditorEnabled is true', () => {
        it('should add event listener for editorForceClosed event', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            expect(addEventListenerSpy).toHaveBeenCalledWith('editorForceClosed', expect.any(Function));
        });

        it('should call onForceClose when event matches editor type', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            // Create a custom event with matching editor type
            const mockEvent = new CustomEvent('editorForceClosed', {
                detail: { editorType: 'description' },
            });

            // Call the event listener directly
            eventListener(mockEvent);

            expect(mockOnForceClose).toHaveBeenCalledTimes(1);
        });

        it('should not call onForceClose when event editor type does not match', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            // Create a custom event with different editor type
            const mockEvent = new CustomEvent('editorForceClosed', {
                detail: { editorType: 'add-comment' as EditorType },
            });

            // Call the event listener directly
            eventListener(mockEvent);

            expect(mockOnForceClose).not.toHaveBeenCalled();
        });

        it('should handle edit-comment editor types', () => {
            const editCommentType = 'edit-comment-123' as EditorType;
            renderHook(() => useEditorForceClose(editCommentType, mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            // Create a custom event with matching edit-comment editor type
            const mockEvent = new CustomEvent('editorForceClosed', {
                detail: { editorType: editCommentType },
            });

            // Call the event listener directly
            eventListener(mockEvent);

            expect(mockOnForceClose).toHaveBeenCalledTimes(1);
        });

        it('should remove event listener on unmount', () => {
            const { unmount } = renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('editorForceClosed', eventListener);
        });

        it('should re-setup event listener when dependencies change', () => {
            const { rerender } = renderHook(
                ({ editorType, onForceClose }) => useEditorForceClose(editorType, onForceClose, true),
                {
                    initialProps: {
                        editorType: 'description' as EditorType,
                        onForceClose: mockOnForceClose,
                    },
                },
            );

            expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

            // Change editor type
            const newMockOnForceClose = jest.fn();
            rerender({
                editorType: 'add-comment' as EditorType,
                onForceClose: newMockOnForceClose,
            });

            // Should remove old listener and add new one
            expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
            expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('when isAtlaskitEditorEnabled is false', () => {
        it('should not add event listener', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, false));

            expect(addEventListenerSpy).not.toHaveBeenCalled();
        });

        it('should not remove event listener on unmount', () => {
            const { unmount } = renderHook(() => useEditorForceClose('description', mockOnForceClose, false));

            unmount();

            expect(removeEventListenerSpy).not.toHaveBeenCalled();
        });
    });

    describe('when isAtlaskitEditorEnabled is undefined (default)', () => {
        it('should default to enabled and add event listener', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose));

            expect(addEventListenerSpy).toHaveBeenCalledWith('editorForceClosed', expect.any(Function));
        });
    });

    describe('edge cases', () => {
        it('should handle events without detail property', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            // Create a custom event without detail
            const mockEvent = new CustomEvent('editorForceClosed');

            // Currently throws an error when accessing event.detail.editorType on undefined detail
            expect(() => eventListener(mockEvent)).toThrow('Cannot read properties of null');
            expect(mockOnForceClose).not.toHaveBeenCalled();
        });

        it('should handle events with null detail', () => {
            renderHook(() => useEditorForceClose('description', mockOnForceClose, true));

            // Get the event listener function that was registered
            const eventListener = addEventListenerSpy.mock.calls[0][1];

            // Create event with null detail
            const mockEvent = {
                detail: null,
            } as CustomEvent;

            // Currently throws an error when accessing null.editorType
            expect(() => eventListener(mockEvent)).toThrow('Cannot read properties of null');
            expect(mockOnForceClose).not.toHaveBeenCalled();
        });
    });
});
