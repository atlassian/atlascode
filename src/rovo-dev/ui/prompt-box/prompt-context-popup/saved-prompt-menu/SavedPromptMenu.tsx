import AddIcon from '@atlaskit/icon/core/add';
import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import ChevronLeftIcon from '@atlaskit/icon/core/chevron-left';
import SearchIcon from '@atlaskit/icon/core/search';
import VideoWatchLaterSavedIcon from '@atlaskit/icon-lab/core/video-watch-later-saved';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

import { SavedPrompt } from '../../../utils';

interface SavedPromptMenuProps {
    fetchSavedPrompts: () => Promise<SavedPrompt[]>;
    canFetchSavedPrompts?: boolean;
    onPromptSelected: (prompt: SavedPrompt) => void;
    onClose: () => void;
}

enum MenuState {
    SearchForPrompt,
    ExplorePrompt,
}

export const SavedPromptMenu: React.FC<SavedPromptMenuProps> = ({
    fetchSavedPrompts,
    canFetchSavedPrompts = false,
    onPromptSelected,
    onClose,
}) => {
    const [menuState, setMenuState] = React.useState<MenuState>(MenuState.SearchForPrompt);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedPrompt, setSelectedPrompt] = React.useState<SavedPrompt | null>(null);
    const [prompts, setPrompts] = React.useState<SavedPrompt[]>([]);

    React.useEffect(() => {
        if (canFetchSavedPrompts) {
            fetchSavedPrompts()
                .then(setPrompts)
                .catch(() => {
                    setPrompts([]);
                });
        }
    }, [fetchSavedPrompts, canFetchSavedPrompts]);

    const filteredPrompts = React.useMemo(
        () => prompts.filter((prompt) => prompt.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [prompts, searchTerm],
    );

    const menuHeader = React.useMemo(
        () =>
            menuState === MenuState.SearchForPrompt ? 'Use saved prompt' : selectedPrompt ? selectedPrompt.name : '',
        [menuState, selectedPrompt],
    );

    const handleOpenPrompt = React.useCallback(
        (prompt: SavedPrompt) => {
            setSelectedPrompt(prompt);
            setMenuState(MenuState.ExplorePrompt);
        },
        [setSelectedPrompt, setMenuState],
    );

    const handleInjectPrompt = React.useCallback(
        (prompt: SavedPrompt) => {
            onPromptSelected(prompt);
            onClose();
        },
        [onPromptSelected, onClose],
    );

    const handleBackButton = React.useCallback(() => {
        if (menuState === MenuState.ExplorePrompt) {
            setMenuState(MenuState.SearchForPrompt);
            setSelectedPrompt(null);
        } else if (menuState === MenuState.SearchForPrompt) {
            onClose();
        }
    }, [menuState, onClose]);

    return (
        <div className="saved-prompt-menu-container">
            <div className="saved-prompt-menu-header">
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <button onClick={handleBackButton} className="saved-prompt-menu-back-button">
                        <ChevronLeftIcon label="Back" />
                    </button>
                    <div className="saved-prompt-menu-header-icon">
                        <VideoWatchLaterSavedIcon label="Saved Prompts" />
                    </div>
                    <div className="saved-prompt-menu-header-text">
                        <span>{menuHeader}</span>
                    </div>
                </div>
                {menuState === MenuState.ExplorePrompt && (
                    <Tooltip content="Insert">
                        <button
                            onClick={() => handleInjectPrompt(selectedPrompt!)}
                            className="saved-prompt-menu-inject-button"
                        >
                            <AddIcon label="Inject prompt" />
                        </button>
                    </Tooltip>
                )}
            </div>

            <div className="saved-prompt-menu-prompt-details">
                {menuState === MenuState.SearchForPrompt && (
                    <>
                        <Textfield
                            className="saved-prompt-menu-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.currentTarget.value)}
                            placeholder="Search for a prompt..."
                            isCompact={true}
                            elemBeforeInput={<SearchIcon label="Search" />}
                        />
                        <div className="saved-prompt-menu-search-results">
                            {filteredPrompts.map((prompt, idx) => (
                                <div
                                    key={`${prompt.content_file}-${idx}`}
                                    className="saved-prompt-menu-search-result"
                                    onClick={() => handleOpenPrompt(prompt)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AngleBracketsIcon label="Prompt file" size="small" />
                                        {prompt.name}
                                    </div>
                                    <button
                                        className="saved-prompt-menu-inject-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInjectPrompt(prompt);
                                        }}
                                    >
                                        <AddIcon label="Inject prompt" />
                                    </button>
                                </div>
                            ))}
                            {!canFetchSavedPrompts && (
                                <div className="saved-prompt-menu-no-results">
                                    <Spinner /> Initializing Rovo Dev process...
                                </div>
                            )}
                            {filteredPrompts.length === 0 && canFetchSavedPrompts && (
                                <div className="saved-prompt-menu-no-results">No prompts found.</div>
                            )}
                        </div>
                    </>
                )}
                {menuState === MenuState.ExplorePrompt && selectedPrompt && (
                    <div className="saved-prompt-menu-prompt-description">
                        <p>{selectedPrompt.description || 'No description available.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
