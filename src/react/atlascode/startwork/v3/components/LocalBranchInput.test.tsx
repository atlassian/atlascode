import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { LocalBranchInput } from './LocalBranchInput';

describe('LocalBranchInput', () => {
    it('should replace spaces with dashes in branch name', () => {
        const onLocalBranchChange = jest.fn();
        render(<LocalBranchInput localBranch="" onLocalBranchChange={onLocalBranchChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'feature TEST 123' } });

        expect(onLocalBranchChange).toHaveBeenCalledWith('feature-TEST-123');
    });

    it('should display current branch name', () => {
        const onLocalBranchChange = jest.fn();
        render(<LocalBranchInput localBranch="feature/TEST-123" onLocalBranchChange={onLocalBranchChange} />);

        const input = screen.getByRole('textbox');
        expect((input as HTMLInputElement).value).toBe('feature/TEST-123');
    });
});
