import { LoadingButton } from '@atlaskit/button';
import InlineDialog from '@atlaskit/inline-dialog';
import { User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@material-ui/core';
import React from 'react';
import VotesForm from '../VotesForm';
import WatchesForm from '../WatchesForm';
import WorklogForm from '../WorklogForm';
import Tooltip from '@atlaskit/tooltip';
import EmojiFrequentIcon from '@atlaskit/icon/glyph/emoji/frequent';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import WatchFilledIcon from '@atlaskit/icon/glyph/watch-filled';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';

type Props = {
    handleRefresh: () => void;
    handleAddWatcher: (u: any) => void;
    handleRemoveWatcher: (u: any) => void;
    handleAddVote: (u: any) => void;
    handleRemoveVote: (u: any) => void;
    handleInlineEdit(field: FieldUI, value: string): void;
    currentUser: User;
    fields: FieldUIs;
    fieldValues: FieldValues;
    loadingField: string;
    fetchUsers: (input: string) => Promise<any[]>;
    handleStartWork: () => void;
};

export const IssueSidebarButtonGroup: React.FC<Props> = ({
    handleRefresh,
    handleAddWatcher,
    handleRemoveWatcher,
    handleAddVote,
    handleRemoveVote,
    handleInlineEdit,
    currentUser,
    fields,
    fieldValues,
    loadingField,
    fetchUsers,
    handleStartWork,
}) => {
    const originalEstimate: string = fieldValues['timetracking'] ? fieldValues['timetracking'].originalEstimate : '';
    const numWatches: string =
        fieldValues['watches'] && fieldValues['watches'].watchCount > 0 ? fieldValues['watches'].watchCount : '';

    const numVotes: string = fieldValues['votes'] && fieldValues['votes'].votes > 0 ? fieldValues['votes'].votes : '';

    const allowVoting: boolean =
        fieldValues['reporter'] && currentUser && fieldValues['reporter'].accountId !== currentUser.accountId;

    const [worklogDialogOpen, setWorklogDialogOpen] = React.useState(false);
    const [votesDialogOpen, setVotesDialogOpen] = React.useState(false);
    const [watchesDialogOpen, setWatchesDialogOpen] = React.useState(false);
    const [isStartWorkHovered, setIsStartWorkHovered] = React.useState(false);

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Tooltip content="Create a branch and transition this issue">
                <LoadingButton
                    style={{
                        alignContent: 'center',
                        border: isStartWorkHovered
                            ? '1px solid var(--vscode-list-focusOutline)'
                            : '1px solid var(--vscode-editorGroup-border)',
                        background: 'var(--vscode-editor-background)',

                        color: 'var(--vscode-editor-foreground)',
                    }}
                    onClick={handleStartWork}
                    iconBefore={<BitbucketBranchesIcon label="Start work" />}
                    isLoading={false}
                    onMouseOver={() => setIsStartWorkHovered(true)}
                    onMouseLeave={() => setIsStartWorkHovered(false)}
                    onFocus={() => setIsStartWorkHovered(true)}
                    onBlur={() => setIsStartWorkHovered(false)}
                >
                    Start work
                </LoadingButton>
            </Tooltip>
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '4px',
                    background: 'var(--vscode-editor-background)',
                }}
            >
                <Tooltip content="Refresh">
                    <LoadingButton
                        className="ac-button-secondary"
                        onClick={handleRefresh}
                        iconBefore={<RefreshIcon label="refresh" />}
                        isLoading={loadingField === 'refresh'}
                    />
                </Tooltip>
                {fields['worklog'] && (
                    <div className="ac-inline-dialog">
                        <InlineDialog
                            content={
                                <WorklogForm
                                    onSave={(val: any) => {
                                        handleInlineEdit(fields['worklog'], val);
                                    }}
                                    onCancel={() => setWorklogDialogOpen(false)}
                                    originalEstimate={originalEstimate}
                                />
                            }
                            isOpen={worklogDialogOpen}
                            onClose={() => setWorklogDialogOpen(false)}
                            placement="left-start"
                        >
                            <Tooltip content="Log work">
                                <LoadingButton
                                    className="ac-button-secondary"
                                    onClick={() => setWorklogDialogOpen(true)}
                                    iconBefore={<EmojiFrequentIcon label="Log Work" />}
                                    isLoading={loadingField === 'worklog'}
                                />
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
                {fields['watches'] && (
                    <div className="ac-inline-dialog">
                        <InlineDialog
                            content={
                                <WatchesForm
                                    onFetchUsers={async (input: string) => await fetchUsers(input)}
                                    onAddWatcher={handleAddWatcher}
                                    onRemoveWatcher={handleRemoveWatcher}
                                    currentUser={currentUser}
                                    onClose={() => setWatchesDialogOpen(false)}
                                    watches={fieldValues['watches']}
                                />
                            }
                            isOpen={watchesDialogOpen}
                            onClose={() => setWatchesDialogOpen(false)}
                            placement="left-start"
                        >
                            <Tooltip content="Watch options">
                                <LoadingButton
                                    className="ac-button-secondary"
                                    onClick={() => {
                                        setWatchesDialogOpen(true);
                                    }}
                                    iconBefore={
                                        fieldValues['watches'].isWatching ? (
                                            <WatchFilledIcon label="Watches" />
                                        ) : (
                                            <WatchIcon label="Watches" />
                                        )
                                    }
                                    isLoading={loadingField === 'watches'}
                                >
                                    {numWatches}
                                </LoadingButton>
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
                {fields['votes'] && (
                    <div className="ac-inline-dialog">
                        <InlineDialog
                            content={
                                <VotesForm
                                    onAddVote={handleAddVote}
                                    onRemoveVote={handleRemoveVote}
                                    currentUser={currentUser}
                                    onClose={() => setVotesDialogOpen(false)}
                                    allowVoting={allowVoting}
                                    votes={fieldValues['votes']}
                                />
                            }
                            isOpen={votesDialogOpen}
                            onClose={() => setVotesDialogOpen(false)}
                            placement="left-start"
                        >
                            <Tooltip content="Vote options">
                                <LoadingButton
                                    className="ac-button-secondary"
                                    onClick={() => setVotesDialogOpen(true)}
                                    iconBefore={
                                        fieldValues['votes'].hasVoted ? (
                                            <StarFilledIcon label="Votes" />
                                        ) : (
                                            <StarIcon label="Votes" />
                                        )
                                    }
                                    isLoading={loadingField === 'votes'}
                                >
                                    {numVotes}
                                </LoadingButton>
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
            </Box>
        </Box>
    );
};
