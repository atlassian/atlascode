import { LoadingButton } from '@atlaskit/button';
import EmojiFrequentIcon from '@atlaskit/icon/glyph/emoji/frequent';
import LikeIcon from '@atlaskit/icon/glyph/like';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import WatchFilledIcon from '@atlaskit/icon/glyph/watch-filled';
import AssetsSchemaIcon from '@atlaskit/icon-lab/core/assets-schema';
import InlineDialog from '@atlaskit/inline-dialog';
import Tooltip from '@atlaskit/tooltip';
import { Transition, User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@material-ui/core';
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

    // Helper function for active button styling
    const getActiveButtonStyle = (isActive: boolean) => {
        return isActive
            ? {
                  border: '1px solid var(--vscode-focusBorder)',
                  borderRadius: '3px',
                  paddingBottom: '2px',
              }
            : {};
    };

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
                justifyContent: 'space-between',
            }}
        >
            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                <Tooltip content="Create a branch and transition this issue">
                    <LoadingButton
                        className="ac-button"
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
                    <LoadingButton
                        spacing="none"
                        className="ac-button-secondary"
                        onClick={handleRefresh}
                        iconBefore={<RefreshIcon label="refresh" />}
                        isLoading={loadingField === 'refresh'}
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
                                <LoadingButton
                                    spacing="none"
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
                                <LoadingButton
                                    spacing="none"
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
                                    style={getActiveButtonStyle(
                                        fieldValues['watches'] && fieldValues['watches'].watchCount > 0,
                                    )}
                                >
                                    {numWatches}
                                </LoadingButton>
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
                                <LoadingButton
                                    spacing="none"
                                    className="ac-button-secondary"
                                    onClick={() => setVotesDialogOpen(true)}
                                    iconBefore={<LikeIcon label="Votes" />}
                                    isLoading={loadingField === 'votes'}
                                    style={getActiveButtonStyle(fieldValues['votes'] && fieldValues['votes'].votes > 0)}
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
