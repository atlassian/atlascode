import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DeleteIcon from '@atlaskit/icon/core/delete';
import EditIcon from '@atlaskit/icon/core/edit';
import TableTree from '@atlaskit/table-tree';
import { Worklog, WorklogContainer } from '@atlassianlabs/jira-pi-common-models';
import { formatDistanceToNow, parseISO } from 'date-fns';
import * as React from 'react';

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

const Actions = (data: ItemData) => {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {data.onEdit && (
                <Button
                    appearance="subtle"
                    iconBefore={<EditIcon size="small" label="Edit" />}
                    onClick={() => data.onEdit?.(data.worklog)}
                    spacing="compact"
                />
            )}
            {data.onDelete && (
                <Button
                    appearance="subtle"
                    iconBefore={<DeleteIcon size="small" label="Delete" />}
                    onClick={() => data.onDelete?.(data.worklog)}
                    spacing="compact"
                />
            )}
        </div>
    );
};

type WorklogsProps = {
    worklogs: WorklogContainer;
    onEditWorklog?: (worklog: Worklog) => void;
    onDeleteWorklog?: (worklog: Worklog) => void;
};

export default class Worklogs extends React.Component<WorklogsProps, {}> {
    constructor(props: any) {
        super(props);
    }

    override render() {
        return (
            <TableTree
                columns={[Author, Comment, TimeSpent, Created, Actions]}
                columnWidths={['100%', '100%', '150px', '150px', '120px']}
                items={this.props.worklogs.worklogs.map((worklog) => {
                    return {
                        id: worklog.id,
                        content: {
                            worklog: worklog,
                            onEdit: this.props.onEditWorklog,
                            onDelete: this.props.onDeleteWorklog,
                        },
                    };
                })}
            />
        );
    }
}
