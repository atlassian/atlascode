import './PromptContextPopup.css';

import AddIcon from '@atlaskit/icon/core/add';
import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import CrossIcon from '@atlaskit/icon/core/cross';
import VideoWatchLaterSavedIcon from '@atlaskit/icon-lab/core/video-watch-later-saved';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

import { SavedPrompt } from '../../utils';
import { SavedPromptMenu } from './saved-prompt-menu/SavedPromptMenu';

interface PromptContextPopupProps {
    onAddRepositoryFile?: () => void;
    fetchSavedPrompts?: () => Promise<SavedPrompt[]>;
    canFetchSavedPrompts?: boolean;
    onSelectedSavedPrompt?: (prompt: SavedPrompt) => void;
}

const PopupContainer = React.forwardRef<HTMLDivElement, PopupComponentProps>(
    ({ children, 'data-testid': testId, xcss: _xcss, ...props }, ref) => (
        <div {...props} className="popup-item-container" ref={ref}>
            {children}
        </div>
    ),
);

const PromptContextPopup: React.FC<PromptContextPopupProps> = ({
    onAddRepositoryFile,
    fetchSavedPrompts,
    canFetchSavedPrompts,
    onSelectedSavedPrompt,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSavedPromptsMenuOpen, setIsSavedPromptsMenuOpen] = React.useState(false);

    const handlePromptSelected = React.useCallback(
        (prompt: SavedPrompt) => {
            onSelectedSavedPrompt?.(prompt);
            setIsSavedPromptsMenuOpen(false);
            setIsOpen(false);
        },
        [onSelectedSavedPrompt],
    );

    return (
        <Popup
            isOpen={isOpen}
            shouldRenderToParent={true}
            trigger={(props) => (
                <Tooltip content="Add">
                    {isOpen ? (
                        <button
                            {...props}
                            onClick={() => setIsOpen(false)}
                            className="prompt-button-secondary-open"
                            aria-label="Prompt context (open)"
                        >
                            <CrossIcon label="Close" />
                        </button>
                    ) : (
                        <button
                            {...props}
                            onClick={() => setIsOpen(true)}
                            className="prompt-button-secondary"
                            aria-label="Prompt context"
                        >
                            <AddIcon label="Open prompt context" />
                        </button>
                    )}
                </Tooltip>
            )}
            content={() => (
                <>
                    {isSavedPromptsMenuOpen && fetchSavedPrompts ? (
                        <SavedPromptMenu
                            fetchSavedPrompts={fetchSavedPrompts}
                            canFetchSavedPrompts={canFetchSavedPrompts}
                            onClose={() => {
                                setIsSavedPromptsMenuOpen(false);
                            }}
                            onPromptSelected={handlePromptSelected}
                        />
                    ) : (
                        <div style={{ padding: '8px' }}>
                            {fetchSavedPrompts && (
                                <PromptContextPopupItem
                                    icon={<VideoWatchLaterSavedIcon label="Saved Prompts" />}
                                    label="Use saved prompt"
                                    onClick={() => setIsSavedPromptsMenuOpen(true)}
                                />
                            )}
                            {onAddRepositoryFile && (
                                <PromptContextPopupItem
                                    icon={<AngleBracketsIcon label="Add repository file" />}
                                    label="Reference file from repository"
                                    onClick={onAddRepositoryFile}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
            placement="top-start"
            popupComponent={PopupContainer}
            onClose={() => {
                setIsOpen(false);
                setIsSavedPromptsMenuOpen(false);
            }}
        />
    );
};

const PromptContextPopupItem: React.FC<{
    label: string;
    icon: JSX.Element;
    description?: string;
    onClick?: () => void;
}> = ({ label, icon, description, onClick }) => {
    return (
        <div className="prompt-context-popup-item" onClick={onClick}>
            <div className="prompt-context-icon">{icon}</div>
            <div className="prompt-context-content">
                <div className="prompt-context-label">{label}</div>
                {description && <div className="prompt-context-description">{description}</div>}
            </div>
        </div>
    );
};
export default PromptContextPopup;
