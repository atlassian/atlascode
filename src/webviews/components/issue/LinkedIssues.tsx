import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueLink, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { AssigneeColumn, Priority, StatusColumn, Summary } from './IssueColumns';

type LinkedIssuesProps = {
    issuelinks: MinimalIssueLink<DetailedSiteInfo>[];
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
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
            <div style={{ width: '16px', height: '16px' }}>
                <Tooltip content={data.issue.issuetype.name}>
                    <img src={data.issue.issuetype.iconUrl} alt={data.issue.issuetype.name || 'Issue type'} />
                </Tooltip>
            </div>
        ) : (
            <React.Fragment />
        );

    return (
        <div className="ac-flex-space-between">
            <p style={{ display: 'inline' }}>
                <em style={{ position: 'absolute', bottom: '2.25em' }}>{data.linkDescription}</em>
            </p>
            {issueTypeMarkup}
            <Button
                appearance="subtle-link"
                onClick={() => data.onIssueClick({ siteDetails: data.issue.siteDetails, key: data.issue.key })}
            >
                {data.issue.key}
            </Button>
        </div>
    );
};

export const LinkedIssues: React.FunctionComponent<LinkedIssuesProps> = ({
    issuelinks,
    onIssueClick,
    onDelete,
    onStatusChange,
}) => {
    return (
        <TableTree
            columns={[IssueKey, Summary, Priority, AssigneeColumn, StatusColumn]}
            columnWidths={['150px', '100px', '20px', '150px', '150px']}
            items={issuelinks.map((issuelink) => {
                return {
                    id: issuelink.id,
                    content: {
                        linkDescription: issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward,
                        issue: issuelink.inwardIssue || issuelink.outwardIssue,
                        onIssueClick: onIssueClick,
                        onDelete: onDelete,
                        onStatusChange: onStatusChange,
                    },
                };
            })}
        />
    );
};
