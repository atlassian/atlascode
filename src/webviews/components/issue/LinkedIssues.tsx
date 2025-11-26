import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueLink, MinimalIssueOrKeyAndSite, User } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { AssigneeColumn, Priority, StatusColumn, Summary } from './IssueColumns';

type LinkedIssuesProps = {
    issuelinks: MinimalIssueLink<DetailedSiteInfo>[];
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
    onAssigneeChange?: (issueKey: string, assignee: User | null) => void;
    fetchUsers?: (input: string) => Promise<User[]>;
};

type ItemData = {
    linkDescription: string;
    issue: IssueLinkIssue<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
};

const IssueKey = (data: ItemData) => {
    const issueTypeMarkup =
        data.issue.issuetype && data.issue.issuetype.name && data.issue.issuetype.iconUrl ? (
            <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                <Tooltip content={data.issue.issuetype.name}>
                    <img src={data.issue.issuetype.iconUrl} alt={data.issue.issuetype.name || 'Issue type'} />
                </Tooltip>
            </div>
        ) : (
            <React.Fragment />
        );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <em
                style={{
                    fontSize: '11px',
                    fontStyle: 'italic',
                    color: 'var(--vscode-descriptionForeground)',
                }}
            >
                {data.linkDescription}
            </em>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {issueTypeMarkup}
                <Button
                    appearance="subtle-link"
                    onClick={() => data.onIssueClick({ siteDetails: data.issue.siteDetails, key: data.issue.key })}
                >
                    {data.issue.key}
                </Button>
            </div>
        </div>
    );
};

export const LinkedIssues: React.FunctionComponent<LinkedIssuesProps> = ({
    issuelinks,
    onIssueClick,
    onDelete,
    onStatusChange,
    onAssigneeChange,
    fetchUsers,
}) => {
    return (
        <TableTree
            columns={[IssueKey, Summary, Priority, AssigneeColumn, StatusColumn]}
            columnWidths={['100%', '100%', '20px', '100%', '150px']}
            items={issuelinks.map((issuelink) => {
                return {
                    id: issuelink.id,
                    content: {
                        linkDescription: issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward,
                        issue: issuelink.inwardIssue || issuelink.outwardIssue,
                        onIssueClick: onIssueClick,
                        onDelete: onDelete,
                        onStatusChange: onStatusChange,
                        onAssigneeChange: onAssigneeChange,
                        fetchUsers: fetchUsers,
                    },
                };
            })}
        />
    );
};
