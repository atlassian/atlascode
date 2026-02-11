import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import PromptContextPopup from './PromptContextPopup';

const mockOnAddRepositoryFile = jest.fn();

describe('PromptContextPopup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders closed state initially', () => {
        render(<PromptContextPopup onAddRepositoryFile={mockOnAddRepositoryFile} />);
        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context (open)')).not.toBeTruthy();
    });

    it('toggles open state when trigger button is clicked', () => {
        render(<PromptContextPopup onAddRepositoryFile={mockOnAddRepositoryFile} />);

        const triggerButton = screen.getByLabelText('Prompt context');
        fireEvent.click(triggerButton);

        expect(screen.getByLabelText('Prompt context (open)')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context')).not.toBeTruthy();
    });

    it('closes popup when close button is clicked', () => {
        render(<PromptContextPopup onAddRepositoryFile={mockOnAddRepositoryFile} />);

        // Open popup
        fireEvent.click(screen.getByLabelText('Prompt context'));

        // Close popup
        fireEvent.click(screen.getByLabelText('Prompt context (open)'));

        expect(screen.getByLabelText('Prompt context')).toBeTruthy();
        expect(screen.queryByLabelText('Prompt context (open)')).not.toBeTruthy();
    });

    it('renders all items when open', () => {
        render(<PromptContextPopup onAddRepositoryFile={mockOnAddRepositoryFile} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));

        expect(screen.getByText('Reference file from repository')).toBeTruthy();
    });

    it('calls item action when item is clicked', () => {
        render(<PromptContextPopup onAddRepositoryFile={mockOnAddRepositoryFile} />);

        fireEvent.click(screen.getByLabelText('Prompt context'));
        fireEvent.click(screen.getByText('Reference file from repository'));

        expect(mockOnAddRepositoryFile).toHaveBeenCalledTimes(1);
    });
});
