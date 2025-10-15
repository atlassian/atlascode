import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { AssigneeColumn, Priority, StatusColumn, Summary } from './IssueColumns';

type ItemData = {
    issue: IssueLinkIssue<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
};

const IssueKey = (data: ItemData) => (
    <div className="ac-flex-space-between">
        <div style={{ width: '16px', height: '16px' }}>
            <Tooltip content={data.issue.issuetype.name}>
                <img src={data.issue.issuetype.iconUrl} alt={data.issue.issuetype.name || 'Issue type'} />
            </Tooltip>
        </div>
        <Button
            appearance="subtle-link"
            onClick={() => data.onIssueClick({ siteDetails: data.issue.siteDetails, key: data.issue.key })}
        >
            {data.issue.key}
        </Button>
    </div>
);

export default class IssueList extends React.Component<
    {
        issues: IssueLinkIssue<DetailedSiteInfo>[];
        onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
        onStatusChange?: (issueKey: string, statusName: string) => void;
    },
    {}
> {
    constructor(props: any) {
        super(props);
    }

    override render() {
        return (
            <TableTree
                columns={[IssueKey, Summary, Priority, AssigneeColumn, StatusColumn]}
                columnWidths={['150px', '100px', '20px', '150px', '150px']}
                items={this.props.issues.map((issue) => {
                    return {
                        id: issue.key,
                        content: {
                            issue: issue,
                            onIssueClick: this.props.onIssueClick,
                            onStatusChange: this.props.onStatusChange,
                        },
                    };
                })}
            />
        );
    }
}
