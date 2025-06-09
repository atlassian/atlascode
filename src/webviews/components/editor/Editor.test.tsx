import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useEditor } from './Editor';

describe('Editor', () => {
    const mockOnChange = jest.fn();
    const mockOnSave = jest.fn();
    const mockFetchUsers = jest.fn().mockResolvedValue([
        { displayName: 'User One', mention: '@user1' },
        { displayName: 'User Two', mention: '@user2' },
    ]);

    const defaultProps = {
        value: '',
        onChange: mockOnChange,
        onSave: mockOnSave,
        fetchUsers: mockFetchUsers,
        enabled: true,
    };

    interface MockUser {
        displayName: string;
        mention: string;
        avatarUrl?: string;
    }

    const MockEditorContainer = ({ value, onChange, onSave, fetchUsers, enabled }: any) => {
        const { viewHost, handleSave } = useEditor<MockUser>({
            value,
            onChange,
            onSave,
            fetchUsers,
            enabled,
        });

        return (
            <>
                <div ref={viewHost} style={{ width: '100%', height: '100%' }} />
                <button onClick={handleSave}>Save</button>
            </>
        );
    };
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the editor with initial value', () => {
        const { getByText } = render(<MockEditorContainer {...defaultProps} value="Initial value" />);
        expect(getByText('Initial value')).toBeTruthy();
    });

    it('calls onSave when the handleSave button is clicked', () => {
        const { getByText } = render(<MockEditorContainer {...defaultProps} value="value" />);
        const saveButton = getByText('Save');
        fireEvent.click(saveButton);
        expect(mockOnSave).toHaveBeenCalled();
    });
});
