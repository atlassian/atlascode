import * as React from 'react';
import { RovoDevProviderMessage } from 'src/rovo-dev/rovoDevWebviewProviderMessages';

import { useMessagingApi } from '../messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';

interface LivePreviewButtonProps {
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
}

export const LivePreviewButton: React.FC<LivePreviewButtonProps> = ({ messagingApi: { postMessage } }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        postMessage({ type: RovoDevViewResponseType.ReportCreateLivePreviewButtonClicked });
        setIsLoading(true);
        postMessage({ type: RovoDevViewResponseType.CreateLivePreview });
    };

    return (
        <button className="pull-request-button" onClick={handleClick} title="Create live preview" disabled={isLoading}>
            {isLoading ? (
                <i className="codicon codicon-loading codicon-modifier-spin" />
            ) : (
                <i className="codicon codicon-play" />
            )}
            Create live preview
        </button>
    );
};
