import { render, screen } from '@testing-library/react';
import React from 'react';

import { SuccessAlert } from './SuccessAlert';

describe('SuccessAlert', () => {
    it('should display success message with branch and transition information', () => {
        const submitResponse = {
            transistionStatus: 'In Progress',
            branch: 'feature/TEST-123-test-issue',
            upstream: 'origin',
        };

        render(<SuccessAlert submitResponse={submitResponse} />);

        expect(screen.getByText('Success!')).toBeTruthy();
        expect(screen.getByText('- Assigned the issue to you')).toBeTruthy();
        expect(screen.getByText(/Transitioned status to/)).toBeTruthy();
        expect(screen.getByText('In Progress')).toBeTruthy();
        expect(screen.getByText(/Switched to/)).toBeTruthy();
        expect(screen.getByText('feature/TEST-123-test-issue')).toBeTruthy();
    });

    it('should display success message without optional fields', () => {
        const submitResponse = {};

        render(<SuccessAlert submitResponse={submitResponse} />);

        expect(screen.getByText('Success!')).toBeTruthy();
        expect(screen.getByText('- Assigned the issue to you')).toBeTruthy();
        expect(screen.queryByText(/Transitioned status/)).toBeNull();
        expect(screen.queryByText(/Switched to/)).toBeNull();
    });
});
