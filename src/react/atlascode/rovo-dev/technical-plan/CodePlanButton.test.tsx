import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { CodePlanButton } from './CodePlanButton';

describe('CodePlanButton', () => {
    it('renders correctly', () => {
        const mockExecute = jest.fn();
        const { container, getByText } = render(<CodePlanButton execute={mockExecute} />);

        expect(container.querySelector('.code-plan-button-container')).toBeTruthy();
        expect(getByText('Code plan')).toBeTruthy();
    });

    it('calls execute function when clicked', () => {
        const mockExecute = jest.fn();

        const { getByText } = render(<CodePlanButton execute={mockExecute} />);

        const button = getByText('Code plan');
        fireEvent.click(button);

        expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('has the correct class names', () => {
        const mockExecute = jest.fn();
        const { container } = render(<CodePlanButton execute={mockExecute} />);

        const buttonContainer = container.querySelector('.code-plan-button-container');
        const button = container.querySelector('.code-plan-button');

        expect(buttonContainer).toBeTruthy();
        expect(button).toBeTruthy();
    });

    it('is disabled when the disabled prop is true', () => {
        const mockExecute = jest.fn();
        const { getByText } = render(<CodePlanButton execute={mockExecute} disabled={true} />);

        const button = getByText('Code plan');

        fireEvent.click(button);
        expect(mockExecute).toHaveBeenCalledTimes(0);
    });
});
