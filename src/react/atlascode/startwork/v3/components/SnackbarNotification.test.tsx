import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SnackbarNotification } from './SnackbarNotification';

describe('SnackbarNotification', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render when open is true', () => {
        render(<SnackbarNotification open={true} onClose={mockOnClose} message="Test message" title="Test title" />);

        expect(screen.getByText('Test title')).toBeTruthy();
        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('should not render when open is false', () => {
        render(<SnackbarNotification open={false} onClose={mockOnClose} message="Test message" title="Test title" />);

        expect(screen.queryByText('Test title')).toBeNull();
        expect(screen.queryByText('Test message')).toBeNull();
    });

    it('should call onClose when close button is clicked', () => {
        render(<SnackbarNotification open={true} onClose={mockOnClose} message="Test message" title="Test title" />);

        const closeButton = screen.getByLabelText('close');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should render without title when title is not provided', () => {
        render(<SnackbarNotification open={true} onClose={mockOnClose} message="Test message" />);

        expect(screen.queryByText('Test title')).toBeNull();
        expect(screen.getByText('Test message')).toBeTruthy();
    });

    it('should render with default severity when not provided', () => {
        render(<SnackbarNotification open={true} onClose={mockOnClose} message="Test message" />);

        const alert = screen.getByRole('alert');
        expect(alert.className).toContain('MuiAlert-standardSuccess');
    });

    it('should render with custom severity when provided', () => {
        render(<SnackbarNotification open={true} onClose={mockOnClose} message="Test message" severity="error" />);

        const alert = screen.getByRole('alert');
        expect(alert.className).toContain('MuiAlert-standardError');
    });
});
