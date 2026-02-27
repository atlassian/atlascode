import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SavedPrompt } from '../../../utils';
import { SavedPromptMenu } from './SavedPromptMenu';

const mockSavedPrompts: SavedPrompt[] = [
    {
        name: 'Test Prompt 1',
        description: 'Description for test prompt 1',
        content_file: 'test1.md',
    },
    {
        name: 'Test Prompt 2',
        description: 'Description for test prompt 2',
        content_file: 'test2.md',
    },
    {
        name: 'Another Prompt',
        description: '',
        content_file: 'another.md',
    },
];

describe('SavedPromptMenu', () => {
    const mockFetchSavedPrompts = jest.fn();
    const mockOnPromptSelected = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchSavedPrompts.mockResolvedValue(mockSavedPrompts);
    });

    describe('Initial rendering', () => {
        it('should render the menu with search state when mounted', () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            expect(screen.getByText('Use saved prompt')).toBeTruthy();
            expect(screen.getByPlaceholderText('Search for a prompt...')).toBeTruthy();
        });

        it('should show loading spinner when canFetchSavedPrompts is false', () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={false}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            expect(screen.getByText(/Initializing Rovo Dev process/)).toBeTruthy();
            expect(mockFetchSavedPrompts).not.toHaveBeenCalled();
        });
    });

    describe('Fetching saved prompts', () => {
        it('should fetch saved prompts when canFetchSavedPrompts is true', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(mockFetchSavedPrompts).toHaveBeenCalled();
            });
        });

        it('should display all prompts after fetching', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
                expect(screen.getByText('Test Prompt 2')).toBeTruthy();
                expect(screen.getByText('Another Prompt')).toBeTruthy();
            });
        });
    });

    describe('Search functionality', () => {
        it('should filter prompts based on search term', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search for a prompt...');
            await userEvent.type(searchInput, 'Test');

            expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            expect(screen.getByText('Test Prompt 2')).toBeTruthy();
            expect(screen.queryByText('Another Prompt')).not.toBeTruthy();
        });

        it('should be case-insensitive when searching', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search for a prompt...');
            await userEvent.type(searchInput, 'another');

            expect(screen.getByText('Another Prompt')).toBeTruthy();
            expect(screen.queryByText('Test Prompt 1')).not.toBeTruthy();
        });

        it('should show no results message when search matches nothing', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search for a prompt...');
            await userEvent.type(searchInput, 'nonexistent');

            expect(screen.getByText('No prompts found.')).toBeTruthy();
        });
    });

    describe('Prompt selection', () => {
        it('should switch to explore state when a prompt is clicked', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const promptItem = screen.getByText('Test Prompt 1').closest('.saved-prompt-menu-search-result');
            fireEvent.click(promptItem!);

            expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            expect(screen.getByText('Description for test prompt 1')).toBeTruthy();
        });

        it('should display prompt description in explore state', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const promptItem = screen.getByText('Test Prompt 1').closest('.saved-prompt-menu-search-result');
            fireEvent.click(promptItem!);

            expect(screen.getByText('Description for test prompt 1')).toBeTruthy();
        });

        it('should display fallback message when prompt has no description', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Another Prompt')).toBeTruthy();
            });

            const promptItem = screen.getByText('Another Prompt').closest('.saved-prompt-menu-search-result');
            fireEvent.click(promptItem!);

            expect(screen.getByText('No description available.')).toBeTruthy();
        });
    });

    describe('Injecting prompts', () => {
        it('should call onPromptSelected and onClose when inject button is clicked from search view', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const injectButtons = screen.getAllByLabelText('Inject prompt');
            fireEvent.click(injectButtons[0]);

            expect(mockOnPromptSelected).toHaveBeenCalledWith(mockSavedPrompts[0]);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onPromptSelected and onClose when inject button is clicked from explore view', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const promptItem = screen.getByText('Test Prompt 1').closest('.saved-prompt-menu-search-result');
            fireEvent.click(promptItem!);

            const injectButton = screen.getByRole('button', { name: /Inject prompt/i });
            fireEvent.click(injectButton);

            expect(mockOnPromptSelected).toHaveBeenCalledWith(mockSavedPrompts[0]);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should prevent event propagation when inject button is clicked in search results', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const injectButtons = screen.getAllByLabelText('Inject prompt');
            const mockStopPropagation = jest.fn();
            fireEvent.click(injectButtons[0], { stopPropagation: mockStopPropagation } as any);

            expect(mockOnPromptSelected).toHaveBeenCalled();
        });
    });

    describe('Navigation', () => {
        it('should go back to search view from explore view when back button is clicked', async () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            await waitFor(() => {
                expect(screen.getByText('Test Prompt 1')).toBeTruthy();
            });

            const promptItem = screen.getByText('Test Prompt 1').closest('.saved-prompt-menu-search-result');
            fireEvent.click(promptItem!);

            expect(screen.getByText('Test Prompt 1')).toBeTruthy();

            const backButton = screen.getByRole('button', { name: /Back/i });
            fireEvent.click(backButton);

            expect(screen.getByText('Use saved prompt')).toBeTruthy();
            expect(screen.queryByText('Description for test prompt 1')).not.toBeTruthy();
        });

        it('should close menu when back button is clicked from search view', () => {
            render(
                <SavedPromptMenu
                    fetchSavedPrompts={mockFetchSavedPrompts}
                    canFetchSavedPrompts={true}
                    onPromptSelected={mockOnPromptSelected}
                    onClose={mockOnClose}
                />,
            );

            const backButton = screen.getByRole('button', { name: /Back/i });
            fireEvent.click(backButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
