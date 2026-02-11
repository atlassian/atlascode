import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DraftStatusButton } from './DraftStatusButton';

describe('DraftStatusButton', () => {
    const mockOnToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when user is not the author', () => {
        it('should display draft chip when PR is draft', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={false} isLoading={false} onToggle={mockOnToggle} />);

            const chip = screen.queryByText('Draft');
            expect(chip).toBeTruthy();
        });

        it('should display nothing when PR is not draft', () => {
            const { container } = render(
                <DraftStatusButton isDraft={false} isAuthor={false} isLoading={false} onToggle={mockOnToggle} />,
            );

            expect(container.firstChild).toBeNull();
        });

        it('should not allow clicking the draft chip', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={false} isLoading={false} onToggle={mockOnToggle} />);

            const chip = screen.getByText('Draft');
            fireEvent.click(chip);

            expect(mockOnToggle).not.toHaveBeenCalled();
        });
    });

    describe('when user is the author and PR is draft', () => {
        it('should display "Mark as ready" button', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.queryByRole('button', { name: /mark as ready/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).toBeNull();
        });

        it('should call onToggle with false when "Mark as ready" is clicked', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as ready/i });
            fireEvent.click(button);

            expect(mockOnToggle).toHaveBeenCalledTimes(1);
            expect(mockOnToggle).toHaveBeenCalledWith(false);
        });

        it('should disable button and show loading spinner when loading', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={true} isLoading={true} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as ready/i });
            expect(button.getAttribute('disabled')).not.toBeNull();
            const progressbar = screen.queryByRole('progressbar');
            expect(progressbar).toBeTruthy();
        });

        it('should not call onToggle when button is disabled', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={true} isLoading={true} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as ready/i });
            fireEvent.click(button);

            expect(mockOnToggle).not.toHaveBeenCalled();
        });
    });

    describe('when user is the author and PR is not draft', () => {
        it('should display "Mark as draft" button', () => {
            render(<DraftStatusButton isDraft={false} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.queryByRole('button', { name: /mark as draft/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).toBeNull();
        });

        it('should call onToggle with true when "Mark as draft" is clicked', () => {
            render(<DraftStatusButton isDraft={false} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as draft/i });
            fireEvent.click(button);

            expect(mockOnToggle).toHaveBeenCalledTimes(1);
            expect(mockOnToggle).toHaveBeenCalledWith(true);
        });

        it('should disable button and show loading spinner when loading', () => {
            render(<DraftStatusButton isDraft={false} isAuthor={true} isLoading={true} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as draft/i });
            expect(button.getAttribute('disabled')).not.toBeNull();
            const progressbar = screen.queryByRole('progressbar');
            expect(progressbar).toBeTruthy();
        });
    });

    describe('button styling', () => {
        it('should have success color when PR is draft (Mark as ready)', () => {
            render(<DraftStatusButton isDraft={true} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as ready/i });
            expect(button.className).toContain('MuiButton-outlinedSuccess');
        });

        it('should have warning color when PR is not draft (Mark as draft)', () => {
            render(<DraftStatusButton isDraft={false} isAuthor={true} isLoading={false} onToggle={mockOnToggle} />);

            const button = screen.getByRole('button', { name: /mark as draft/i });
            expect(button.className).toContain('MuiButton-outlinedWarning');
        });
    });
});
