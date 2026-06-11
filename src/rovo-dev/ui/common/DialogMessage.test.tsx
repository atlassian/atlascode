import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ErrorDialogMessage } from '../utils';
import { DialogMessageItem } from './DialogMessage';

const errorMessage: ErrorDialogMessage = {
    event_kind: '_RovoDevDialog',
    type: 'error',
    uid: 'test-error',
    title: 'Something went wrong',
    text: 'A friendly error message',
    statusCode: '500',
    stackTrace: 'Error: boom\n    at stack frame',
    stderr: 'component stack details',
    rovoDevLogs: ['log line 1', 'log line 2'],
};

describe('DialogMessageItem', () => {
    const onLinkClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: jest.fn(),
            },
        });
    });

    it('hides diagnostic details from external users', () => {
        render(<DialogMessageItem msg={errorMessage} onLinkClick={onLinkClick} isAtlassianUser={false} />);

        expect(screen.getByText('Something went wrong')).toBeTruthy();
        expect(screen.getByText('A friendly error message')).toBeTruthy();
        expect(screen.queryByText(/Extension Stack Trace/)).toBeNull();
        expect(screen.queryByText(/Error: boom/)).toBeNull();
        expect(screen.queryByText(/Rovo Dev Logs/)).toBeNull();
        expect(screen.queryByText(/log line 1/)).toBeNull();
        expect(screen.queryByText(/Rovo Dev Stderr/)).toBeNull();
        expect(screen.queryByText(/component stack details/)).toBeNull();
        expect(screen.queryByLabelText('copy-details-button')).toBeNull();
    });

    it('shows diagnostic details to Atlassian users and includes them in copied text', () => {
        render(<DialogMessageItem msg={errorMessage} onLinkClick={onLinkClick} isAtlassianUser />);

        expect(screen.getByText(/Extension Stack Trace/)).toBeTruthy();
        expect(screen.getByText(/Error: boom/)).toBeTruthy();
        expect(screen.getByText(/Rovo Dev Logs/)).toBeTruthy();
        expect(screen.getByText(/log line 1/)).toBeTruthy();
        expect(screen.getByText(/Rovo Dev Stderr/)).toBeTruthy();
        expect(screen.getByText(/component stack details/)).toBeTruthy();

        fireEvent.click(screen.getByLabelText('copy-details-button'));

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('Extension Stack Trace:\nError: boom'),
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('Rovo Dev Logs:\nlog line 1'),
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('Rovo Dev Stderr:\ncomponent stack details'),
        );
    });
});
