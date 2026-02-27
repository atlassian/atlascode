import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MergeButton } from './MergeButton';

describe('MergeButton', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when PR is open and not a draft', () => {
        it('should display enabled "Merge" button', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.queryByRole('button', { name: /merge/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).toBeNull();
        });

        it('should call onClick when "Merge" is clicked', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            fireEvent.click(button);

            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });
    });

    describe('when PR is merged', () => {
        it('should display disabled "Merged" button', () => {
            render(<MergeButton prState="MERGED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.queryByRole('button', { name: /merged/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).not.toBeNull();
        });

        it('should not call onClick when clicked', () => {
            render(<MergeButton prState="MERGED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merged/i });
            fireEvent.click(button);

            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });

    describe('when PR is a draft', () => {
        it('should display disabled "Merge" button', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={true} onClick={mockOnClick} />);

            const button = screen.queryByRole('button', { name: /merge/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).not.toBeNull();
        });

        it('should not call onClick when clicked', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={true} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            fireEvent.click(button);

            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });

    describe('when PR is merging', () => {
        it('should display disabled "Merge" button', () => {
            render(<MergeButton prState="OPEN" isMerging={true} isDraft={false} onClick={mockOnClick} />);

            const button = screen.queryByRole('button', { name: /merge/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).not.toBeNull();
        });

        it('should not call onClick when clicked', () => {
            render(<MergeButton prState="OPEN" isMerging={true} isDraft={false} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            fireEvent.click(button);

            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });

    describe('when PR is declined', () => {
        it('should display disabled "Merge" button', () => {
            render(<MergeButton prState="DECLINED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.queryByRole('button', { name: /merge/i });
            expect(button).toBeTruthy();
            expect(button?.getAttribute('disabled')).not.toBeNull();
        });

        it('should not call onClick when clicked', () => {
            render(<MergeButton prState="DECLINED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            fireEvent.click(button);

            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });

    describe('button styling', () => {
        it('should have primary contained styling', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            expect(button.className).toContain('MuiButton-containedPrimary');
        });
    });

    describe('button text', () => {
        it('should display "Merge" when state is OPEN', () => {
            render(<MergeButton prState="OPEN" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            expect(screen.queryByText('Merge')).toBeTruthy();
        });

        it('should display "Merged" when state is MERGED', () => {
            render(<MergeButton prState="MERGED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            expect(screen.queryByText('Merged')).toBeTruthy();
        });

        it('should display "Merged" when state is DECLINED', () => {
            render(<MergeButton prState="DECLINED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            expect(screen.queryByText('Merged')).toBeTruthy();
        });

        it('should display "Merged" when state is SUPERSEDED', () => {
            render(<MergeButton prState="SUPERSEDED" isMerging={false} isDraft={false} onClick={mockOnClick} />);

            expect(screen.queryByText('Merged')).toBeTruthy();
        });
    });

    describe('multiple disable conditions', () => {
        it('should be disabled when PR is draft and merging', () => {
            render(<MergeButton prState="OPEN" isMerging={true} isDraft={true} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merge/i });
            expect(button.getAttribute('disabled')).not.toBeNull();
            fireEvent.click(button);
            expect(mockOnClick).not.toHaveBeenCalled();
        });

        it('should be disabled when PR is not open and is draft', () => {
            render(<MergeButton prState="MERGED" isMerging={false} isDraft={true} onClick={mockOnClick} />);

            const button = screen.getByRole('button', { name: /merged/i });
            expect(button.getAttribute('disabled')).not.toBeNull();
            fireEvent.click(button);
            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });
});
