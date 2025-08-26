import { LoadingButton } from '@atlaskit/button';
import Button, { IconButton } from '@atlaskit/button/new';
import ClockIcon from '@atlaskit/icon/core/clock';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import EyeOpenFilledIcon from '@atlaskit/icon/core/eye-open-filled';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import AssetsSchemaIcon from '@atlaskit/icon-lab/core/assets-schema';
import InlineDialog from '@atlaskit/inline-dialog';
import Tooltip from '@atlaskit/tooltip';
import { Transition, User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@mui/material';
import React from 'react';

import VotesForm from '../../VotesForm';
import WatchesForm from '../../WatchesForm';
import WorklogForm from '../../WorklogForm';
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
    handleStartWork: () => void;
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
    handleStartWork,
    transitions,
}) => {
    const originalEstimate: string = fieldValues['timetracking'] ? fieldValues['timetracking'].originalEstimate : '';
    const numWatches: string =
        fieldValues['watches'] && fieldValues['watches'].watchCount > 0 ? fieldValues['watches'].watchCount : '';

    const numVotes: string = fieldValues['votes'] && fieldValues['votes'].votes > 0 ? fieldValues['votes'].votes : '';

    const allowVoting: boolean = !!currentUser;

    const [worklogDialogOpen, setWorklogDialogOpen] = React.useState(false);
    const [votesDialogOpen, setVotesDialogOpen] = React.useState(false);
    const [watchesDialogOpen, setWatchesDialogOpen] = React.useState(false);

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap-reverse',
                width: '100%',
                justifyContent: 'space-between',
                gap: '4px 0',
            }}
        >
            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                <Tooltip content="Create a branch and transition this issue">
                    <LoadingButton
                        className="ac-button"
                        testId="issue.start-work-button"
                        onClick={handleStartWork}
                        iconBefore={<AssetsSchemaIcon label="Start work" />}
                        isLoading={false}
                    >
                        Start work
                    </LoadingButton>
                </Tooltip>
                {fields['status'] && (
                    <Box
                        data-testid="issue.status-transition-menu"
                        style={{ display: 'inline-flex', alignItems: 'center', flexGrow: 0 }}
                    >
                        <StatusTransitionMenu
                            transitions={transitions}
                            currentStatus={fieldValues['status']}
                            isStatusButtonLoading={loadingField === 'status'}
                            onStatusChange={handleStatusChange}
                        />
                    </Box>
                )}
            </Box>
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignContent: 'center',
                    gap: '4px',
                    justifyContent: 'flex-end',
                    background: 'var(--vscode-editor-background)',
                }}
            >
                <Tooltip content="Refresh">
                    <IconButton
                        label="Refresh"
                        onClick={handleRefresh}
                        icon={() => <RefreshIcon label="Refresh" />}
                        isLoading={loadingField === 'refresh'}
                        spacing="compact"
                    />
                </Tooltip>
                {fields['worklog'] && (
                    <div className={`ac-inline-dialog ${worklogDialogOpen ? 'active' : ''}`}>
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
                            placement="bottom-end"
                        >
                            <Tooltip content="Log work">
                                <IconButton
                                    label="Log Work"
                                    onClick={() => setWorklogDialogOpen(true)}
                                    icon={() => <ClockIcon label="Log Work" />}
                                    isLoading={loadingField === 'worklog'}
                                    spacing="compact"
                                />
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
                {fields['watches'] && (
                    <div className={`ac-inline-dialog ${watchesDialogOpen ? 'active' : ''}`}>
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
                            placement="bottom-end"
                        >
                            <Tooltip content="Watch options">
                                {numWatches ? (
                                    <Button
                                        onClick={() => {
                                            setWatchesDialogOpen(true);
                                        }}
                                        iconBefore={() =>
                                            fieldValues['watches'].isWatching ? (
                                                <EyeOpenFilledIcon label="Watches" />
                                            ) : (
                                                <EyeOpenIcon label="Watches" />
                                            )
                                        }
                                        isLoading={loadingField === 'watches'}
                                        isSelected={fieldValues['watches']?.isWatching}
                                        spacing="compact"
                                    >
                                        {numWatches}
                                    </Button>
                                ) : (
                                    <IconButton
                                        label="Watch options"
                                        onClick={() => {
                                            setWatchesDialogOpen(true);
                                        }}
                                        icon={() =>
                                            fieldValues['watches'].isWatching ? (
                                                <EyeOpenFilledIcon label="Watches" />
                                            ) : (
                                                <EyeOpenIcon label="Watches" />
                                            )
                                        }
                                        isLoading={loadingField === 'watches'}
                                        spacing="compact"
                                    />
                                )}
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
                {fields['votes'] && (
                    <div className={`ac-inline-dialog ${votesDialogOpen ? 'active' : ''}`}>
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
                            placement="bottom-end"
                        >
                            <Tooltip content="Vote options">
                                {numVotes ? (
                                    <Button
                                        onClick={() => setVotesDialogOpen(true)}
                                        iconBefore={() => <ThumbsUpIcon label="Votes" />}
                                        isLoading={loadingField === 'votes'}
                                        isSelected={fieldValues['votes']?.hasVoted}
                                        spacing="compact"
                                    >
                                        {numVotes}
                                    </Button>
                                ) : (
                                    <IconButton
                                        label="Vote options"
                                        onClick={() => setVotesDialogOpen(true)}
                                        icon={() => <ThumbsUpIcon label="Votes" />}
                                        isLoading={loadingField === 'votes'}
                                        spacing="compact"
                                    />
                                )}
                            </Tooltip>
                        </InlineDialog>
                    </div>
                )}
            </Box>
        </Box>
    );
};
