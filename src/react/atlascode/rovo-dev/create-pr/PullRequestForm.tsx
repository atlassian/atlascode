import PullRequestIcon from '@atlaskit/icon/core/pull-request';
import React from 'react';
import { ConnectionTimeout } from 'src/util/time';

import { PostMessagePromiseFunc } from '../../messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../rovoDevViewMessages';
import { ToolReturnParseResult } from '../utils';

const PullRequestButton: React.FC<{
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ onClick }) => {
    return (
        <button className="pull-request-button" onClick={onClick} title="Create Pull Request">
            <PullRequestIcon label="Create Pull Request" spacing="none" />
            Create Pull Request
        </button>
    );
};

interface PullRequestFormProps {
    onCancel: () => void;
    postMessageWithReturn: PostMessagePromiseFunc<RovoDevViewResponse, any>;
    modifiedFiles?: ToolReturnParseResult[];
    onPullRequestCreated: (url: string) => void;
    isFormVisible?: boolean;
    setFormVisible?: (visible: boolean) => void;
}

export const PullRequestForm: React.FC<PullRequestFormProps> = ({
    onCancel,
    postMessageWithReturn,
    modifiedFiles,
    onPullRequestCreated,
    isFormVisible = false,
    setFormVisible,
}) => {
    if (!modifiedFiles || modifiedFiles.length === 0) {
        return null;
    }
    const [isPullRequestLoading, setPullRequestLoading] = React.useState(false);

    const handleToggleForm = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
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

        const response = await postMessageWithReturn(
            {
                type: RovoDevViewResponseType.CreatePR,
                payload: { branchName, commitMessage: message },
            },
            RovoDevViewResponseType.CreatePRComplete,
            ConnectionTimeout,
        );
        setPullRequestLoading(false);
        onPullRequestCreated((response as any).data.url || '');
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
                                    required
                                />
                            </div>
                        </div>
                        <div className="pull-request-form-actions">
                            <button onClick={() => onCancel()} className="pull-request-cancel-button">
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
                <PullRequestButton onClick={handleToggleForm} />
            )}
        </>
    );
};
