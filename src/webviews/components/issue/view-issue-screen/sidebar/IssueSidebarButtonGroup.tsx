import { LoadingButton } from '@atlaskit/button';
import InlineDialog from '@atlaskit/inline-dialog';
import { Transition, User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@material-ui/core';
import React from 'react';
import VotesForm from '../../VotesForm';
import WatchesForm from '../../WatchesForm';
import WorklogForm from '../../WorklogForm';
import Tooltip from '@atlaskit/tooltip';
import EmojiFrequentIcon from '@atlaskit/icon/glyph/emoji/frequent';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import WatchFilledIcon from '@atlaskit/icon/glyph/watch-filled';

import { StatusTransitionMenu } from './StatusTransitionMenu';

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
    handleStatusChange: (t: Transition) => void;
    transitions: Transition[];
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
    handleStatusChange,
    transitions,
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

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
            }}
        >
            {fields['status'] && (
                <Box style={{ display: 'inline-flex', alignItems: 'center', flexGrow: 0 }}>
                    <StatusTransitionMenu
                        transitions={transitions}
                        currentStatus={fieldValues['status']}
                        isStatusButtonLoading={loadingField === 'status'}
                        onStatusChange={handleStatusChange}
                    />
                </Box>
            )}
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    flexGrow: 1,
                    background: 'var(--vscode-editor-background)',
                }}
            >
                <Tooltip content="Refresh">
                    <LoadingButton
                        spacing="compact"
                        className="ac-button-secondary-new"
                        onClick={handleRefresh}
                        iconBefore={<RefreshIcon label="refresh" />}
                        isLoading={loadingField === 'refresh'}
                    />
                </Tooltip>
                {fields['worklog'] && (
                    <div className="ac-inline-dialog-new">
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
                                    spacing="compact"
                                    className="ac-button-secondary-new"
                                    onClick={() => setWorklogDialogOpen(true)}
                                    iconBefore={<EmojiFrequentIcon label="Log Work" />}
                                    isLoading={loadingField === 'worklog'}
                                />
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
                {fields['watches'] && (
                    <div className="ac-inline-dialog-new">
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
                                    spacing="compact"
                                    className="ac-button-secondary-new"
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
                    <div className="ac-inline-dialog-new">
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
                                    spacing="compact"
                                    className="ac-button-secondary-new"
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
