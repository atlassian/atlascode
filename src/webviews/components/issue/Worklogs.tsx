import Avatar from '@atlaskit/avatar';
import TableTree from '@atlaskit/table-tree';
import { Worklog, WorklogContainer } from '@atlassianlabs/jira-pi-common-models';
import { formatDistanceToNow, parseISO } from 'date-fns';
import * as React from 'react';

type ItemData = { worklog: Worklog };

const Created = (data: ItemData) => (
    <p style={{ display: 'inline' }}>{`${formatDistanceToNow(parseISO(data.worklog.created))} ago`}</p>
);
const Comment = (data: ItemData) => <p style={{ display: 'inline' }}>{data.worklog.comment}</p>;
const TimeSpent = (data: ItemData) => <p style={{ display: 'inline' }}>{data.worklog.timeSpent}</p>;
const Author = (data: ItemData) => {
    const avatar =
        data.worklog.author.avatarUrls && data.worklog.author.avatarUrls['16x16']
            ? data.worklog.author.avatarUrls['16x16']
            : '';
    return (
        <div className="ac-flex">
            <Avatar size="small" borderColor="var(--vscode-dropdown-foreground)!important" src={avatar} />
            <span style={{ marginLeft: '4px' }}>{data.worklog.author.displayName}</span>
        </div>
    );
};

export default class Worklogs extends React.Component<{ worklogs: WorklogContainer }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <TableTree
                columns={[Author, Comment, TimeSpent, Created]}
                columnWidths={['100%', '100%', '150px', '150px']}
                items={this.props.worklogs.worklogs.map((worklog) => {
                    return {
                        id: worklog.id,
                        content: {
                            worklog: worklog,
                        },
                    };
                })}
            />
        );
    }
}
