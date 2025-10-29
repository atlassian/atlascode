import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DeleteIcon from '@atlaskit/icon/core/delete';
import EditIcon from '@atlaskit/icon/core/edit';
import InlineDialog from '@atlaskit/inline-dialog';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { Worklog, WorklogContainer } from '@atlassianlabs/jira-pi-common-models';
import { formatDistanceToNow, parseISO } from 'date-fns';
import * as React from 'react';

import WorklogForm from './WorklogForm';

type ItemData = { worklog: Worklog; onEdit?: (worklog: Worklog) => void; onDelete?: (worklog: Worklog) => void };

const Created = (data: ItemData) => (
    <p style={{ display: 'inline' }}>{`${formatDistanceToNow(parseISO(data.worklog.created))} ago`}</p>
);
const Comment = (data: ItemData) => <p style={{ display: 'inline' }}>{data.worklog.comment}</p>;
const TimeSpent = (data: ItemData) => <p style={{ display: 'inline' }}>{data.worklog.timeSpent}</p>;
const Author = (data: ItemData) => {
    const avatar =
        data.worklog.author.avatarUrls && data.worklog.author.avatarUrls['48x48']
            ? data.worklog.author.avatarUrls['48x48']
            : '';
    return (
        <div className="ac-flex">
            <Avatar size="small" borderColor="var(--vscode-editor-background)!important" src={avatar} />
            <p style={{ marginLeft: '4px' }}>{data.worklog.author.displayName}</p>
        </div>
    );
};

const Actions = (
    data: ItemData & {
        onEditWorklog?: (worklog: Worklog) => void;
        onDeleteWorklog?: (worklog: Worklog) => void;
        editingWorklogId?: string | null;
        deletingWorklogId?: string | null;
        originalEstimate?: string;
        onSaveWorklog?: (worklogData: any) => void;
        onCancelEdit?: () => void;
        onConfirmDelete?: (worklog: Worklog) => void;
        onCancelDelete?: () => void;
    },
) => {
    const isEditing = data.editingWorklogId === data.worklog.id;
    const isDeleting = data.deletingWorklogId === data.worklog.id;

    return (
        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
            {data.onEditWorklog && (
                <div className={`ac-inline-dialog ac-worklog-inline-dialog ${isEditing ? 'active' : ''}`}>
                    <InlineDialog
                        content={
                            <WorklogForm
                                onSave={data.onSaveWorklog!}
                                onCancel={data.onCancelEdit!}
                                originalEstimate={data.originalEstimate || ''}
                                editingWorklog={data.worklog}
                                worklogId={data.worklog.id}
                            />
                        }
                        isOpen={isEditing}
                        onClose={data.onCancelEdit!}
                        placement="left"
                    >
                        <Tooltip content="Edit" position="top">
                            <Button
                                appearance="subtle"
                                iconBefore={<EditIcon size="small" label="Edit" />}
                                onClick={() => data.onEditWorklog?.(data.worklog)}
                                spacing="compact"
                            />
                        </Tooltip>
                    </InlineDialog>
                </div>
            )}
            {data.onDeleteWorklog && (
                <div className={`ac-inline-dialog ac-worklog-inline-dialog ${isDeleting ? 'active' : ''}`}>
                    <InlineDialog
                        content={
                            <div
                                style={{
                                    padding: '0',
                                }}
                            >
                                <p
                                    style={{
                                        color: 'var(--vscode-foreground)',
                                        margin: '0 0 16px 0',
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    Are you sure you want to delete this work log? This action cannot be undone.
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        justifyContent: 'flex-end',
                                    }}
                                >
                                    <Button appearance="subtle" onClick={data.onCancelDelete!} spacing="compact">
                                        Cancel
                                    </Button>
                                    <Button
                                        appearance="danger"
                                        onClick={() => data.onConfirmDelete?.(data.worklog)}
                                        spacing="compact"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        }
                        isOpen={isDeleting}
                        onClose={data.onCancelDelete!}
                        placement="left"
                    >
                        <Tooltip content="Delete" position="top">
                            <Button
                                appearance="subtle"
                                iconBefore={<DeleteIcon size="small" label="Delete" />}
                                onClick={() => data.onDeleteWorklog?.(data.worklog)}
                                spacing="compact"
                            />
                        </Tooltip>
                    </InlineDialog>
                </div>
            )}
        </div>
    );
};

type WorklogsProps = {
    worklogs: WorklogContainer;
    onEditWorklog?: (worklogData: any) => void;
    onDeleteWorklog?: (worklog: Worklog) => void;
    onConfirmDelete?: (worklog: Worklog) => void;
    originalEstimate: string;
};

type WorklogsState = {
    editingWorklogId: string | null;
    deletingWorklogId: string | null;
};

export default class Worklogs extends React.Component<WorklogsProps, WorklogsState> {
    constructor(props: any) {
        super(props);
        this.state = {
            editingWorklogId: null,
            deletingWorklogId: null,
        };
    }

    handleEditWorklog = (worklog: Worklog) => {
        this.setState({ editingWorklogId: worklog.id });
    };

    handleSaveWorklog = (worklogData: any) => {
        if (this.props.onEditWorklog) {
            this.props.onEditWorklog({
                action: 'updateWorklog',
                worklogId: this.state.editingWorklogId,
                worklogData: worklogData,
            });
        }
        this.setState({ editingWorklogId: null });
    };

    handleCancelEdit = () => {
        this.setState({ editingWorklogId: null });
    };

    handleDeleteWorklog = (worklog: Worklog) => {
        this.setState({ deletingWorklogId: worklog.id });
    };

    handleConfirmDelete = (worklog: Worklog) => {
        if (this.props.onConfirmDelete) {
            this.props.onConfirmDelete(worklog);
        }
        this.setState({ deletingWorklogId: null });
    };

    handleCancelDelete = () => {
        this.setState({ deletingWorklogId: null });
    };

    override render() {
        return (
            <TableTree
                columns={[Author, Comment, TimeSpent, Created, Actions]}
                columnWidths={['100%', '100%', '150px', '180px', '50px']}
                items={this.props.worklogs.worklogs.map((worklog) => {
                    return {
                        id: worklog.id,
                        content: {
                            worklog: worklog,
                            onEditWorklog: this.handleEditWorklog,
                            onDeleteWorklog: this.handleDeleteWorklog,
                            editingWorklogId: this.state.editingWorklogId,
                            deletingWorklogId: this.state.deletingWorklogId,
                            originalEstimate: this.props.originalEstimate,
                            onSaveWorklog: this.handleSaveWorklog,
                            onCancelEdit: this.handleCancelEdit,
                            onConfirmDelete: this.handleConfirmDelete,
                            onCancelDelete: this.handleCancelDelete,
                        },
                    };
                })}
            />
        );
    }
}
