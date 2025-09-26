import { fireEvent, render } from '@testing-library/react';
import * as React from 'react';

import { JiraWorkItem } from './JiraWorkItem';

describe('JiraWorkItem', () => {
    const defaultProps = {
        summary: 'Test issue summary',
        onClick: jest.fn(),
    };

    it('shows image when valid iconUrl provided', () => {
        const { container } = render(
            <JiraWorkItem {...defaultProps} issueTypeIconUrl="https://example.com/icon.png" issueTypeName="Bug" />,
        );
        const img = container.querySelector('img');
        expect(img).toBeTruthy();
        expect(img?.src).toBe('https://example.com/icon.png');
        expect(img?.alt).toBe('Bug');
    });

    it('shows placeholder div for broken image URL', () => {
        const { container } = render(<JiraWorkItem {...defaultProps} issueTypeIconUrl="images/no-image.svg" />);
        expect(container.querySelector('img')).toBeFalsy();
        expect(container.querySelector('.jira-work-item-icon')).toBeTruthy();
    });

    it('replaces image with placeholder on error', () => {
        const { container } = render(
            <JiraWorkItem {...defaultProps} issueTypeIconUrl="https://broken-url.com/icon.png" />,
        );

        const img = container.querySelector('img');
        expect(img).toBeTruthy();

        // Simulate image error
        fireEvent.error(img!);

        expect(container.querySelector('img')).toBeFalsy();
        expect(container.querySelector('.jira-work-item-icon')).toBeTruthy();
    });
});
