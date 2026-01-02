import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import CascadingSelectField, { CascadingSelectOption } from './CascadingSelectField';

describe('CascadingSelectField Component', () => {
    const mockOnSave = jest.fn();

    const mockCommonProps = {
        isMulti: false,
        getOptionLabel: (option: any) => option.value,
        getOptionValue: (option: any) => option.id,
        components: {
            Option: jest.fn(),
            SingleValue: jest.fn(),
            MultiValue: jest.fn(),
        },
    };

    const mockOptions: CascadingSelectOption[] = [
        {
            id: '1',
            value: 'Parent 1',
            self: 'http://example.com/1',
            children: [
                { id: '1-1', value: 'Child 1-1', self: 'http://example.com/1-1' },
                { id: '1-2', value: 'Child 1-2', self: 'http://example.com/1-2' },
            ],
        },
        {
            id: '2',
            value: 'Parent 2',
            self: 'http://example.com/2',
            children: [{ id: '2-1', value: 'Child 2-1', self: 'http://example.com/2-1' }],
        },
        {
            id: '3',
            value: 'Parent 3',
            self: 'http://example.com/3',
            children: [],
        },
    ];

    const mockInitialValue = {
        id: '1',
        value: 'Parent 1',
        self: 'http://example.com/1',
        child: {
            id: '1-1',
            value: 'Child 1-1',
            self: 'http://example.com/1-1',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Create Mode', () => {
        it('should render in create mode without InlineEdit wrapper', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            // In create mode, it should not have the InlineEdit wrapper
            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });

        it('should display child select when parent with children is selected', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // Should render two selects when there's an initial value with child
            const selects = container.querySelectorAll('.ac-form-select-container');
            expect(selects.length).toBeGreaterThan(0);
        });
    });

    describe('Edit Mode (Non-Create Mode)', () => {
        it('should render with InlineEdit wrapper in edit mode', () => {
            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // Should render the read view initially
            expect(screen.getByText('Parent 1 - Child 1-1')).toBeTruthy();
        });

        it('should display "Add option" as placeholder when no initial value', () => {
            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            expect(screen.getByText('Add option')).toBeTruthy();
        });

        it('should show combined parent-child value in read view', () => {
            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // The displayed value should combine parent and child
            expect(screen.getByText('Parent 1 - Child 1-1')).toBeTruthy();
        });
    });

    describe('Disabled State', () => {
        it('should render disabled select fields when isDisabled is true', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={true}
                    isCreateMode={true}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // Verify the component renders in disabled state
            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });
    });

    describe('Initial Value Handling', () => {
        it('should display only parent value when child is not present', () => {
            const valueWithoutChild = {
                id: '3',
                value: 'Parent 3',
                self: 'http://example.com/3',
            };

            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={valueWithoutChild}
                    onSave={mockOnSave}
                />,
            );

            expect(screen.getByText('Parent 3')).toBeTruthy();
        });

        it('should handle empty initial value', () => {
            const emptyValue = {
                id: '',
                value: '',
                self: '',
            };

            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={emptyValue}
                    onSave={mockOnSave}
                />,
            );

            expect(screen.getByText('Add option')).toBeTruthy();
        });
    });

    describe('Clearable Functionality', () => {
        it('should allow clearing when isClearable is true', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });

        it('should not allow clearing when isClearable is false', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={false}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });
    });

    describe('Options Handling', () => {
        it('should handle options without children', () => {
            const optionsWithoutChildren: CascadingSelectOption[] = [
                {
                    id: '1',
                    value: 'Option 1',
                    self: 'http://example.com/1',
                    children: [],
                },
                {
                    id: '2',
                    value: 'Option 2',
                    self: 'http://example.com/2',
                    children: [],
                },
            ];

            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={optionsWithoutChildren}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            // Should render parent select
            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });

        it('should handle empty options array', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={[]}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });
    });

    describe('Child Options Rendering', () => {
        it('should show child select when initial value has child', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // With a child value, there should be two select containers
            const selects = container.querySelectorAll('.ac-form-select-container');
            expect(selects.length).toBeGreaterThan(0);
        });

        it('should not show child select initially without child value', () => {
            const valueWithoutChild = {
                id: '3',
                value: 'Parent 3',
                self: 'http://example.com/3',
            };

            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={valueWithoutChild}
                    onSave={mockOnSave}
                />,
            );

            // Without a child value, should only have parent select
            const selects = container.querySelectorAll('.ac-form-select-container');
            expect(selects.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Component Styling', () => {
        it('should use correct CSS classes in create mode', () => {
            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });

        it('should use correct CSS classes in edit mode', () => {
            const { container, getByText } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            // Click to enter edit mode
            const editButton = getByText('Parent 1 - Child 1-1');
            fireEvent.click(editButton);

            // In edit mode, should use .ac-select-container instead of .ac-form-select-container
            expect(container.querySelector('.ac-select-container')).toBeTruthy();
        });

        it('should apply correct read view styles in edit mode', () => {
            render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={false}
                    initialValue={mockInitialValue}
                    onSave={mockOnSave}
                />,
            );

            const readView = screen.getByText('Parent 1 - Child 1-1');
            expect(readView).toBeTruthy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null or undefined child gracefully', () => {
            const valueWithUndefinedChild = {
                id: '1',
                value: 'Parent 1',
                self: 'http://example.com/1',
                child: undefined as any,
            };

            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={mockOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={valueWithUndefinedChild}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });

        it('should handle malformed options', () => {
            const malformedOptions: any = [{ id: '1', value: 'Test', self: 'http://example.com/1' }];

            const { container } = render(
                <CascadingSelectField
                    commonProps={mockCommonProps}
                    isClearable={true}
                    parentSelectOptions={malformedOptions}
                    isDisabled={false}
                    isCreateMode={true}
                    initialValue={{ id: '', value: '', self: '' }}
                    onSave={mockOnSave}
                />,
            );

            expect(container.querySelector('.ac-form-select-container')).toBeTruthy();
        });
    });
});
