import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { NoRepositoryWarning } from './NoRepositoryWarning';

describe('NoRepositoryWarning', () => {
    it('should render warning alert content', () => {
        render(<NoRepositoryWarning />);

        expect(screen.getByText('No repository available')).toBeTruthy();
        expect(screen.getByText('Please open a folder containing a Git repository.')).toBeTruthy();
    });

    it('should not render after close button is clicked', () => {
        const { container } = render(<NoRepositoryWarning />);
        expect(container.firstChild).not.toBeNull();

        const closeButton = screen.getByLabelText('close');
        fireEvent.click(closeButton);

        expect(container.firstChild).toBeNull();
    });
});
