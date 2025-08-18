import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { PushBranchToggle } from './PushBranchToggle';

describe('PushBranchToggle', () => {
    it('should toggle push branch enabled state', () => {
        const onPushBranchChange = jest.fn();
        render(<PushBranchToggle pushBranchEnabled={true} onPushBranchChange={onPushBranchChange} />);

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        expect(onPushBranchChange).toHaveBeenCalledWith(false);
    });

    it('should display correct checkbox state', () => {
        const onPushBranchChange = jest.fn();
        render(<PushBranchToggle pushBranchEnabled={false} onPushBranchChange={onPushBranchChange} />);

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
    });
});
