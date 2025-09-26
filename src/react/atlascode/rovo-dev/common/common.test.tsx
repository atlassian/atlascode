import { render, screen } from '@testing-library/react';
import React from 'react';
import { MarkedDown } from './common';

describe('MarkedDown autolinking', () => {
    it('wraps complex URLs with parentheses safely', () => {
        const text = 'See (this) https://example.com/path(with)parentheses and more';
        render(<MarkedDown value={text} />);
        const link = screen.getByText('https://example.com/path(with)parentheses');
        expect(link).toBeTruthy();
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/path(with)parentheses');
    });

    it('handles percent-encoded characters', () => {
        const text = 'Encoded: https://example.com/path%20with%20spaces/file%28name%29';
        render(<MarkedDown value={text} />);
        const link = screen.getByText('https://example.com/path%20with%20spaces/file%28name%29');
        expect(link).toBeTruthy();
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/path%20with%20spaces/file%28name%29');
    });

    it('does not double wrap urls already in angle brackets', () => {
        const text = 'Already linked <https://example.com/a(b)>';
        render(<MarkedDown value={text} />);
        const link = screen.getByText('https://example.com/a(b)');
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/a(b)');
    });

    it('does not break markdown link syntax [text](url)', () => {
        const text = 'Click [link](https://example.com/a(b)) please';
        render(<MarkedDown value={text} />);
        const link = screen.getByText('link');
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/a(b)');
    });
});
