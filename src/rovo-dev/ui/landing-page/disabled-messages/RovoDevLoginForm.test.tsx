import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { RovoDevLoginForm } from './RovoDevLoginForm';

// A minimal mock for Atlaskit CreatableSelect to allow us to test Tab selection behavior.
jest.mock('@atlaskit/select', () => ({
    __esModule: true,
    CreatableSelect: React.forwardRef(
        ({ inputId, inputValue, onInputChange, onChange, onKeyDown, isDisabled, tabSelectsValue }: any, ref: any) => {
            const handleKeyDown = (e: any) => {
                // Simulate tabSelectsValue: when Tab is pressed with input, trigger onChange
                if (e.key === 'Tab' && tabSelectsValue && inputValue?.trim()) {
                    onChange?.({ label: inputValue.trim(), value: inputValue.trim() });
                }
                // Also call the component's onKeyDown for focus management
                onKeyDown?.(e);
            };

            return (
                <input
                    ref={ref}
                    data-testid={inputId}
                    id={inputId}
                    value={inputValue ?? ''}
                    disabled={isDisabled}
                    onChange={(e) => onInputChange?.(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            );
        },
    ),
}));

jest.mock('@atlaskit/button/new', () => ({
    __esModule: true,
    default: ({ children, isDisabled, ...props }: any) => (
        <button disabled={isDisabled} {...props}>
            {children}
        </button>
    ),
}));

jest.mock('@atlaskit/textfield', () => ({
    __esModule: true,
    default: React.forwardRef(({ isDisabled, ...props }: any, ref: any) => (
        <input ref={ref} disabled={isDisabled} {...props} />
    )),
}));

describe('RovoDevLoginForm', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('commits typed host value when tabbing out (AXON-1804)', () => {
        const onSubmit = jest.fn();
        render(<RovoDevLoginForm onSubmit={onSubmit} />);

        const hostInput = screen.getByTestId('host') as HTMLInputElement;
        const emailInput = screen.getByTestId('email') as HTMLInputElement;
        const apiTokenInput = document.getElementById('apiToken') as HTMLInputElement;

        fireEvent.change(hostInput, { target: { value: 'my-site.atlassian.net' } });

        // Pressing Tab should commit the typed value and move focus to email.
        fireEvent.keyDown(hostInput, { key: 'Tab' });
        act(() => {
            jest.runOnlyPendingTimers();
        });

        expect(document.activeElement).toBe(emailInput);

        // The sign-in button should still be disabled until email/token are set, but the host should now be committed.
        // We verify indirectly by setting email/token and submitting.
        fireEvent.change(emailInput, { target: { value: 'a@b.com' } });
        fireEvent.keyDown(emailInput, { key: 'Tab' });
        act(() => {
            jest.runOnlyPendingTimers();
        });

        expect(document.activeElement).toBe(apiTokenInput);

        fireEvent.change(apiTokenInput, { target: { value: 'token' } });

        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        expect(onSubmit).toHaveBeenCalledWith('my-site.atlassian.net', 'a@b.com', 'token');
    });
});
