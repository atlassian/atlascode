import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DraftBanner } from './DraftBanner';

describe('DraftBanner', () => {
    const mockOnMarkReady = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when user is the author', () => {
        it('renders the draft banner with title and description', () => {
            render(<DraftBanner isAuthor={true} onMarkReady={mockOnMarkReady} />);

            expect(screen.getByText('This is a draft pull request')).toBeTruthy();
            expect(
                screen.getByText(
                    "The work is still ongoing. The pull request cannot be merged until it's marked as ready for review.",
                ),
            ).toBeTruthy();
        });

        it('renders the "Mark as ready" button', () => {
            render(<DraftBanner isAuthor={true} onMarkReady={mockOnMarkReady} />);

            const button = screen.getByRole('button', { name: 'Mark as ready' });
            expect(button).toBeTruthy();
        });

        it('calls onMarkReady when the button is clicked', () => {
            render(<DraftBanner isAuthor={true} onMarkReady={mockOnMarkReady} />);

            const button = screen.getByRole('button', { name: 'Mark as ready' });
            fireEvent.click(button);

            expect(mockOnMarkReady).toHaveBeenCalledTimes(1);
        });

        it('renders the button with correct styling', () => {
            render(<DraftBanner isAuthor={true} onMarkReady={mockOnMarkReady} />);

            const button = screen.getByRole('button', { name: 'Mark as ready' });
            expect(button.className).toContain('MuiButton');
        });
    });

    describe('when user is not the author', () => {
        it('renders the draft banner with title and description', () => {
            render(<DraftBanner isAuthor={false} onMarkReady={mockOnMarkReady} />);

            expect(screen.getByText('This is a draft pull request')).toBeTruthy();
            expect(
                screen.getByText(
                    "The work is still ongoing. The pull request cannot be merged until it's marked as ready for review.",
                ),
            ).toBeTruthy();
        });

        it('does not render the "Mark as ready" button', () => {
            render(<DraftBanner isAuthor={false} onMarkReady={mockOnMarkReady} />);

            const button = screen.queryByRole('button', { name: 'Mark as ready' });
            expect(button).toBeNull();
        });
    });

    describe('Alert styling', () => {
        it('renders with info severity', () => {
            const { container } = render(<DraftBanner isAuthor={true} onMarkReady={mockOnMarkReady} />);

            const alert = container.querySelector('.MuiAlert-standardInfo');
            expect(alert).toBeTruthy();
        });
    });
});
