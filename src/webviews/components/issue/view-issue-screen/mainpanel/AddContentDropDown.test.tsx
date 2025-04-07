import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AddContentDropdown } from './AddContentDropDown';

describe('AddContentDropdown', () => {
    const mockHandleAttachmentClick = jest.fn();
    const mockHandleChildIssueClick = jest.fn();
    const mockHandleLinkedIssueClick = jest.fn();
    const mockHandleLogWorkClick = jest.fn();

    const renderComponent = (loading = false) =>
        render(
            <AddContentDropdown
                handleAttachmentClick={mockHandleAttachmentClick}
                handleChildIssueClick={mockHandleChildIssueClick}
                handleLinkedIssueClick={mockHandleLinkedIssueClick}
                handleLogWorkClick={mockHandleLogWorkClick}
                loading={loading}
            />,
        );

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the dropdown trigger button', () => {
        renderComponent();
        expect(screen.getByText('Add')).toBeTruthy();
    });

    it('calls handleAttachmentClick when "Attachment" is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        fireEvent.click(screen.getByText('Attachment'));
        expect(mockHandleAttachmentClick).toHaveBeenCalledTimes(1);
    });

    it('calls handleChildIssueClick when "Child issue" is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        fireEvent.click(screen.getByText('Child issue'));
        expect(mockHandleChildIssueClick).toHaveBeenCalledTimes(1);
    });

    it('calls handleLinkedIssueClick when "Linked issue" is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        fireEvent.click(screen.getByText('Linked issue'));
        expect(mockHandleLinkedIssueClick).toHaveBeenCalledTimes(1);
    });

    it('calls handleLogWorkClick when "Work log" is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        fireEvent.click(screen.getByText('Work log'));
        expect(mockHandleLogWorkClick).toHaveBeenCalledTimes(1);
    });

    it('opens the dropdown menu when the button is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        expect(screen.getByText('Attachment')).toBeTruthy();
        expect(screen.getByText('Child issue')).toBeTruthy();
        expect(screen.getByText('Linked issue')).toBeTruthy();
        expect(screen.getByText('Work log')).toBeTruthy();
    });

    it('closes the dropdown menu when clicking outside', () => {
        renderComponent();
        fireEvent.click(screen.getByText('Add'));
        fireEvent.click(document.body);
        expect(screen.queryByText('Attachment')).not.toBeTruthy();
    });
});
