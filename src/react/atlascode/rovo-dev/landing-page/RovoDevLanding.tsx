import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import { State } from 'src/rovo-dev/rovoDevTypes';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { McpConsentChoice } from '../rovoDevViewMessages';
import { DisabledMessage } from './disabled-messages/DisabledMessage';
import { RovoDevActions, RovoDevJiraWorkItems } from './RovoDevSuggestions';

const RovoDevImg = () => {
    return (
        <svg id="rovoDevLogo" width="55" height="55" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24.519 0.843677C26.4682 -0.281225 28.8698 -0.281226 30.819 0.843676L49.189 11.445C51.1382 12.5699 52.339 14.6488 52.339 16.8986V38.1014C52.339 40.3512 51.1382 42.4301 49.189 43.555L30.819 54.1563C28.8698 55.2812 26.4683 55.2812 24.519 54.1563L6.14902 43.555C4.1998 42.4301 2.99902 40.3512 2.99902 38.1014V16.8986C2.99902 14.6488 4.1998 12.5699 6.14902 11.445L24.519 0.843677Z" />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M23.3317 13.9696L15.5293 18.4734C14.4397 19.0996 13.7714 20.257 13.7714 21.5143V33.4973C13.7714 34.7497 14.4437 35.9121 15.53 36.5387L17.3799 37.6065L25.9098 42.5302C26.9767 43.1455 28.2896 43.1564 29.3651 42.5629C29.3846 42.5478 29.4054 42.5338 29.4273 42.5211C30.1937 42.0791 30.7542 41.3702 31.0177 40.5512C31.125 40.2127 31.1817 39.855 31.1817 39.4888V34.8471L26.6668 32.2421L25.3658 31.4915C23.9376 30.6702 23.0613 29.1518 23.0613 27.5058V15.5228C23.0613 15.0385 23.1378 14.5648 23.2823 14.1164C23.2979 14.0671 23.3144 14.0182 23.3317 13.9696Z"
                fill="#101214"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M29.4285 12.4699C28.3615 11.8545 27.0487 11.8436 25.9731 12.4372C25.9536 12.4523 25.9304 12.4677 25.9085 12.4803C25.1429 12.9227 24.5832 13.6314 24.3201 14.45C24.2131 14.7882 24.1565 15.1455 24.1565 15.5112V20.153L28.5316 22.6772L29.9728 23.5088C31.4012 24.33 32.277 25.848 32.277 27.4942V39.4772C32.277 39.9622 32.2002 40.4366 32.0554 40.8856C32.0399 40.9342 32.0236 40.9825 32.0065 41.0305L39.809 36.5267C40.8985 35.9004 41.5668 34.743 41.5668 33.4857V21.5027C41.5668 20.2504 40.8944 19.0879 39.8081 18.4613L37.8185 17.3128L29.4285 12.4699Z"
                fill="#101214"
            />
        </svg>
    );
};

export const RovoDevLanding: React.FC<{
    currentState: State;
    isHistoryEmpty: boolean;
    onLoginClick: () => void;
    onOpenFolder: () => void;
    onMcpChoice: (choice: McpConsentChoice, serverName?: string) => void;
    onSendMessage: (message: string) => void;
    jiraWorkItems: MinimalIssue<DetailedSiteInfo>[] | undefined;
    onJiraItemClick: (issue: MinimalIssue<DetailedSiteInfo>) => void;
}> = ({
    currentState,
    isHistoryEmpty,
    onLoginClick,
    onOpenFolder,
    onMcpChoice,
    onSendMessage,
    jiraWorkItems,
    onJiraItemClick,
}) => {
    const shouldHideSuggestions = React.useMemo(
        () =>
            !isHistoryEmpty ||
            currentState.state === 'Disabled' ||
            currentState.state === 'ProcessTerminated' ||
            (currentState.state === 'Initializing' && currentState.subState === 'MCPAcceptance'),
        [currentState, isHistoryEmpty],
    );

    return (
        <div
            style={{
                display: 'flex',
                flexFlow: 'column',
                gap: '12px',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 0',
                marginBottom: '12px',
            }}
        >
            <div>
                <RovoDevImg />
            </div>
            <div style={{ fontSize: '15px' }}>Welcome to Rovo Dev Beta</div>
            <div style={{ fontSize: '12px', maxWidth: '270px' }}>
                Rovo Dev can help you understand context of your repository, suggest and make updates.
            </div>

            {!shouldHideSuggestions && (
                <>
                    <RovoDevActions onSendMessage={onSendMessage} />
                    <RovoDevJiraWorkItems jiraWorkItems={jiraWorkItems} onJiraItemClick={onJiraItemClick} />
                </>
            )}

            <DisabledMessage
                currentState={currentState}
                onLoginClick={onLoginClick}
                onMcpChoice={onMcpChoice}
                onOpenFolder={onOpenFolder}
            />
        </div>
    );
};
