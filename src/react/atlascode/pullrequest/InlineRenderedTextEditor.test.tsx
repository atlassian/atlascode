import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

import InlineRenderedTextEditor from './InlineRenderedTextEditor';

jest.mock('src/webviews/components/issue/common/AtlaskitEditor/AtlaskitEditor', () => {
    return jest.fn(({ defaultValue, onSave, onCancel }) => (
        <div data-testid="atlaskit-editor">
            <div data-testid="editor-content">{defaultValue}</div>
            <button data-testid="save-button" onClick={() => onSave && onSave('Updated content')}>
                Save
            </button>
            <button data-testid="cancel-button" onClick={() => onCancel && onCancel()}>
                Cancel
            </button>
        </div>
    ));
});

jest.mock('@mui/material', () => ({
    Box: ({ children, className, onClick, visibility, ...props }: any) => (
        <div className={className} onClick={onClick} style={{ visibility }} data-testid="box" {...props}>
            {children}
        </div>
    ),
    Grid: ({ children, className, onMouseEnter, onMouseLeave, ...props }: any) => (
        <div
            className={className}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            data-testid="grid"
            {...props}
        >
            {children}
        </div>
    ),
    Typography: ({ children, dangerouslySetInnerHTML, ...props }: any) => (
        <div data-testid="typography" {...props}>
            {dangerouslySetInnerHTML ? (
                // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                <span dangerouslySetInnerHTML={dangerouslySetInnerHTML} />
            ) : (
                children
            )}
        </div>
    ),
    Tooltip: ({ children, title }: any) => (
        <div data-testid="tooltip" title={title}>
            {children}
        </div>
    ),
    darken: jest.fn((color, amount) => `darken(${color}, ${amount})`),
    lighten: jest.fn((color, amount) => `lighten(${color}, ${amount})`),
}));

jest.mock('@mui/icons-material/Edit', () => {
    return jest.fn(() => <div data-testid="edit-icon">Edit Icon</div>);
});

jest.mock('@mui/styles', () => ({
    makeStyles: jest.fn(() => () => ({
        container: 'mock-container-class',
        editbutton: 'mock-editbutton-class',
    })),
}));

describe('InlineRenderedTextEditor', () => {
    const defaultProps = {
        rawContent: 'Raw content text',
        htmlContent: '<p>HTML content text</p>',
    };

    const mockMentionsProvider = {
        filter: jest.fn(),
        recordMentionSelection: jest.fn(),
    } as Partial<AtlascodeMentionProvider> as AtlascodeMentionProvider;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('View Mode', () => {
        it('renders HTML content correctly', () => {
            render(<InlineRenderedTextEditor {...defaultProps} />);

            const typography = screen.getByTestId('typography');
            expect(typography).toBeTruthy();
            const htmlElement = typography.querySelector('span');
            expect(htmlElement?.innerHTML).toBe('<p>HTML content text</p>');
        });

        it('does not show edit button when onSave is not provided', () => {
            render(<InlineRenderedTextEditor {...defaultProps} />);

            const editButton = screen.getByTestId('box');
            expect(editButton.style.visibility).toBe('hidden');
        });

        it('switches to edit mode when edit button is clicked', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            render(<InlineRenderedTextEditor {...defaultProps} onSave={mockOnSave} />);

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            expect(screen.getByTestId('atlaskit-editor')).toBeTruthy();
        });
    });

    describe('Edit Mode', () => {
        it('renders AtlaskitEditor with correct props', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            render(<InlineRenderedTextEditor {...defaultProps} onSave={mockOnSave} />);

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            const editor = screen.getByTestId('atlaskit-editor');
            expect(editor).toBeTruthy();

            const editorContent = screen.getByTestId('editor-content');
            expect(editorContent.textContent).toBe('<p>HTML content text</p>');
        });

        it('calls onSave and exits edit mode when save is clicked', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            render(<InlineRenderedTextEditor {...defaultProps} onSave={mockOnSave} />);

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            // Save changes
            const saveButton = screen.getByTestId('save-button');
            await user.click(saveButton);

            expect(mockOnSave).toHaveBeenCalledWith('Updated content');

            expect(screen.queryByTestId('atlaskit-editor')).not.toBeTruthy();
            expect(screen.getByTestId('typography')).toBeTruthy();
        });

        it('exits edit mode without saving when cancel is clicked', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            render(<InlineRenderedTextEditor {...defaultProps} onSave={mockOnSave} />);

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            const cancelButton = screen.getByTestId('cancel-button');
            await user.click(cancelButton);

            expect(mockOnSave).not.toHaveBeenCalled();

            expect(screen.queryByTestId('atlaskit-editor')).not.toBeTruthy();
            expect(screen.getByTestId('typography')).toBeTruthy();
        });

        it('passes mentionsProvider to AtlaskitEditor when provided', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            const AtlaskitEditor = require('src/webviews/components/issue/common/AtlaskitEditor/AtlaskitEditor');

            render(
                <InlineRenderedTextEditor
                    {...defaultProps}
                    onSave={mockOnSave}
                    mentionsProvider={mockMentionsProvider}
                />,
            );

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            expect(AtlaskitEditor).toHaveBeenCalledWith(
                expect.objectContaining({
                    mentionProvider: expect.any(Promise),
                    isBitbucket: true,
                }),
                expect.anything(),
            );
        });

        it('does not pass mentionsProvider when not provided', async () => {
            const user = userEvent.setup();
            const mockOnSave = jest.fn();

            const AtlaskitEditor = require('src/webviews/components/issue/common/AtlaskitEditor/AtlaskitEditor');

            render(<InlineRenderedTextEditor {...defaultProps} onSave={mockOnSave} />);

            const editButton = screen.getByTestId('box');
            await user.click(editButton);

            expect(AtlaskitEditor).toHaveBeenCalledWith(
                expect.objectContaining({
                    mentionProvider: undefined,
                    isBitbucket: true,
                }),
                expect.anything(),
            );
        });
    });

    describe('Props handling', () => {
        it('handles fetchUsers prop', () => {
            const mockFetchUsers = jest.fn();

            render(<InlineRenderedTextEditor {...defaultProps} fetchUsers={mockFetchUsers} />);
            expect(screen.getByTestId('typography')).toBeTruthy();
        });

        it('handles empty content gracefully', () => {
            render(<InlineRenderedTextEditor rawContent="" htmlContent="" />);

            const typography = screen.getByTestId('typography');
            const htmlElement = typography.querySelector('span');
            expect(htmlElement?.innerHTML).toBe('');
        });

        it('handles special HTML characters in content', () => {
            const specialContent = '<p>&lt;script&gt;alert("test")&lt;/script&gt;</p>';

            render(
                <InlineRenderedTextEditor rawContent="<script>alert('test')</script>" htmlContent={specialContent} />,
            );

            const typography = screen.getByTestId('typography');
            const htmlElement = typography.querySelector('span');
            expect(htmlElement?.innerHTML).toBe(specialContent);
        });
    });
});
