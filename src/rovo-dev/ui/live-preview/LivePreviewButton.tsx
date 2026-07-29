import * as React from 'react';

import { RovoDevProviderMessage } from '../../rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';

interface LivePreviewButtonProps {
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
    // preferred handler for starting a live preview; the parent guards re-clicks and
    // hides the button. returns false if it did not start (so we can reset the
    // spinner). falls back to posting the message directly when omitted.
    onCreateLivePreview?: () => boolean;
}

export const LivePreviewButton: React.FC<LivePreviewButtonProps> = ({
    messagingApi: { postMessage },
    onCreateLivePreview,
}) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (isLoading) {
            return;
        }
        setIsLoading(true);
        if (onCreateLivePreview) {
            // reset the spinner if the preview wasn't started (e.g. agent no longer idle)
            if (!onCreateLivePreview()) {
                setIsLoading(false);
            }
        } else {
            postMessage({ type: RovoDevViewResponseType.CreateLivePreview });
        }
    };

    return (
        <button
            className="chat-action-button secondary"
            onClick={handleClick}
            title="Create live preview"
            disabled={isLoading}
        >
            {isLoading ? (
                <i className="codicon codicon-loading codicon-modifier-spin" />
            ) : (
                <i className="codicon codicon-play" />
            )}
            Create live preview
        </button>
    );
};
