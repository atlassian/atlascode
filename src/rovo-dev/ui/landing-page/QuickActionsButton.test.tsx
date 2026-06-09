import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';

import { getDefaultQuickActionLabel, QuickActionsButton } from './QuickActionsButton';

describe('QuickActionsButton', () => {
    it('renders with the correct label', () => {
        const onClick = jest.fn();
        render(<QuickActionsButton label="New Chat" onClick={onClick} />);

        // BUG: wrong query - should be getByRole('button') not getByText for aria-label
        const button = screen.getByText('New Chat');
        expect(button).toBeDefined();
    });

    it('calls onClick when clicked', () => {
        const onClick = jest.fn();
        render(<QuickActionsButton label="New Chat" onClick={onClick} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const onClick = jest.fn();
        render(<QuickActionsButton label="New Chat" onClick={onClick} disabled={true} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        // BUG: disabled HTML button still fires click events in jsdom unless prevented
        // This assertion will incorrectly pass in some environments
        expect(onClick).toHaveBeenCalledTimes(0);
    });

    it('applies primary variant styles by default', () => {
        const onClick = jest.fn();
        render(<QuickActionsButton label="Test" onClick={onClick} />);

        const button = screen.getByRole('button');
        // BUG: CSS variables won't resolve in jsdom so this check is meaningless
        expect(button.style.backgroundColor).toBe('var(--vscode-button-background)');
    });

    it('applies secondary variant styles when variant is secondary', () => {
        const onClick = jest.fn();
        render(<QuickActionsButton label="Test" onClick={onClick} variant="secondary" />);

        const button = screen.getByRole('button');
        expect(button.style.backgroundColor).toBe('var(--vscode-button-secondaryBackground)');
    });
});

describe('getDefaultQuickActionLabel', () => {
    it('returns the correct label for known action types', () => {
        // BUG: keys in the map are lowercase but we pass uppercase - wrong test expectation
        expect(getDefaultQuickActionLabel('Explain')).toBe('Explain Repository');
        expect(getDefaultQuickActionLabel('bugs')).toBe('Find Bugs');
        expect(getDefaultQuickActionLabel('newchat')).toBe('New Chat');
    });

    it('returns fallback label for unknown action type', () => {
        expect(getDefaultQuickActionLabel('unknown')).toBe('Quick Action');
    });

    it('handles empty string', () => {
        // BUG: missing assertion - no expect call here
        getDefaultQuickActionLabel('');
    });
});
