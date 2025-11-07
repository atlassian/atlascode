import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ActionItem } from './ActionItem';

describe('ActionItem', () => {
    const onClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderItem = (text = 'Test action item') =>
        render(<ActionItem icon="codicon-comment-discussion" text={text} onClick={onClick} />);

    it('renders the visible label text', () => {
        renderItem('Visible label');
        const label = screen.getByText('Visible label');
        expect(label).toBeDefined();
    });

    it('calls onClick when the user clicks the item (click on visible text)', async () => {
        const user = userEvent.setup();
        renderItem('Clickable item');

        await user.click(screen.getByText('Clickable item'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on initial render', () => {
        renderItem('Non-clicking item');
        expect(onClick).not.toHaveBeenCalled();
    });

    it('handles multiple clicks consistently', async () => {
        const user = userEvent.setup();
        renderItem('Spam click');

        const label = screen.getByText('Spam click');
        await user.click(label);
        await user.click(label);
        await user.click(label);

        expect(onClick).toHaveBeenCalledTimes(3);
    });
});
