import PullRequestIcon from '@atlaskit/icon/core/pull-request';
import React from 'react';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from 'src/rovo-dev/rovoDevWebviewProviderMessages';
import { ConnectionTimeout } from 'src/util/time';

import { useMessagingApi } from '../../messagingApi';
import { mdParser } from '../common/common';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { DefaultMessage } from '../utils';

const PullRequestButton: React.FC<{
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
    isLoading?: boolean;
}> = ({ onClick, isLoading }) => {
    return (
        <button className="pull-request-button" onClick={onClick} title="Create Pull Request">
            {isLoading ? (
                <i className="codicon codicon-loading codicon-modifier-spin" />
            ) : (
                <PullRequestIcon label="Create Pull Request" spacing="none" />
            )}
            Create Pull Request
        </button>
    );
};

interface PullRequestFormProps {
    onCancel: () => void;
    messagingApi: ReturnType<
        typeof useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>
    >;
    onPullRequestCreated: (url: string) => void;
    isFormVisible?: boolean;
    setFormVisible?: (visible: boolean) => void;
}

export const PullRequestForm: React.FC<PullRequestFormProps> = ({
    onCancel,
    messagingApi: { postMessagePromise },
    onPullRequestCreated,
    isFormVisible = false,
    setFormVisible,
}) => {
    const [isPullRequestLoading, setPullRequestLoading] = React.useState(false);
    const [isBranchNameLoading, setBranchNameLoading] = React.useState(false);
    const [branchName, setBranchName] = React.useState<string | undefined>(undefined);

    const getCurrentBranchName = async () => {
        setBranchNameLoading(true);
        const response = await postMessagePromise(
            { type: RovoDevViewResponseType.GetCurrentBranchName },
            RovoDevProviderMessageType.GetCurrentBranchNameComplete,
            ConnectionTimeout,
        );
        setBranchNameLoading(false);
        setBranchName(response.data.branchName || undefined);
    };

    const handleToggleForm = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        await getCurrentBranchName();
        setFormVisible?.(true);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const message = formData.get('pr-commit-message') as string | null;
        const branchName = formData.get('pr-branch-name') as string | null;

        if (!message || !branchName) {
            return;
        }

        setPullRequestLoading(true);

        const response = await postMessagePromise(
            {
                type: RovoDevViewResponseType.CreatePR,
                payload: { branchName, commitMessage: message },
            },
            RovoDevProviderMessageType.CreatePRComplete,
            ConnectionTimeout,
        );
        setPullRequestLoading(false);

        if (response.data.error) {
            console.error(`Error creating PR: ${response.data.error}`);
            return;
        }
        onPullRequestCreated(response.data.url || '');
    };

    return (
        <>
            {isFormVisible ? (
                <div className="pull-request-form-container">
                    <form onSubmit={handleSubmit} className="pull-request-form-body">
                        <div className="pull-request-form-header">
                            <PullRequestIcon label="pull-request-icon" spacing="none" />
                            Create pull request
                        </div>
                        <div className="pull-request-form-fields">
                            <div className="pull-request-form-field">
                                <label htmlFor="pr-commit-message">Commit message</label>
                                <input
                                    type="text"
                                    id="pr-commit-message"
                                    name="pr-commit-message"
                                    placeholder="Enter a commit message"
                                    required
                                />
                            </div>
                            <div className="pull-request-form-field">
                                <label htmlFor="pr-branch-name">Branch name</label>
                                <input
                                    type="text"
                                    id="pr-branch-name"
                                    name="pr-branch-name"
                                    placeholder="Enter a branch name"
                                    defaultValue={branchName}
                                    required
                                />
                            </div>
                        </div>
                        <div className="pull-request-form-actions">
                            <button type="button" onClick={() => onCancel()} className="pull-request-cancel-button">
                                Cancel
                            </button>
                            <button type="submit" className="pull-request-submit-button">
                                {isPullRequestLoading ? (
                                    <i className="codicon codicon-loading codicon-modifier-spin" />
                                ) : (
                                    <PullRequestIcon label="pull-request-icon" spacing="none" />
                                )}
                                Create PR
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <PullRequestButton onClick={handleToggleForm} isLoading={isBranchNameLoading} />
            )}
        </>
    );
};

export const PullRequestChatItem: React.FC<{ msg: DefaultMessage }> = ({ msg }) => {
    const content = (
        <div
            style={{ display: 'flex', flexDirection: 'column' }}
            dangerouslySetInnerHTML={{ __html: mdParser.render(msg.text || '') }}
        />
    );
    return (
        <div className="chat-message pull-request-chat-item agent-message">
            <PullRequestIcon label="pull-request-icon" spacing="none" />
            <div className="message-content">{content}</div>
        </div>
    );
};
