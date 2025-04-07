import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueLink, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { colorToLozengeAppearanceMap } from '../colors';

type LinkedIssuesProps = {
    issuelinks: MinimalIssueLink<DetailedSiteInfo>[];
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
};

type ItemData = {
    linkDescription: string;
    issue: IssueLinkIssue<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
};

const IssueKey = (data: ItemData) => {
    const issueTypeMarkup =
        data.issue.issuetype && data.issue.issuetype.name && data.issue.issuetype.iconUrl ? (
            <div style={{ width: '16px', height: '16px' }}>
                <Tooltip content={data.issue.issuetype.name}>
                    <img src={data.issue.issuetype.iconUrl} />
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

const Summary = (data: ItemData) => <p style={{ display: 'inline' }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => {
    if (data.issue.priority && data.issue.priority.name && data.issue.priority.iconUrl) {
        return (
            <div style={{ width: '16px', height: '16px' }}>
                <Tooltip content={data.issue.priority.name}>
                    <img src={data.issue.priority.iconUrl} />
                </Tooltip>
            </div>
        );
    }

    return <React.Fragment />;
};

const StatusColumn = (data: ItemData) => {
    if (data.issue.status && data.issue.status.statusCategory) {
        const lozColor: string = colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName];
        return <Lozenge appearance={lozColor}>{data.issue.status.name}</Lozenge>;
    }

    return <React.Fragment />;
};
// const Delete = (data: ItemData) => {
//     return (<div className='ac-delete' onClick={() => data.onDelete(data.issue)}>
//         <TrashIcon label='trash' />
//     </div>);
// };

export const LinkedIssues: React.FunctionComponent<LinkedIssuesProps> = ({ issuelinks, onIssueClick, onDelete }) => {
    return (
        <TableTree
            columns={[IssueKey, Summary, Priority, StatusColumn]}
            columnWidths={['150px', '100%', '20px', '150px']}
            items={issuelinks.map((issuelink) => {
                return {
                    id: issuelink.id,
                    content: {
                        linkDescription: issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward,
                        issue: issuelink.inwardIssue || issuelink.outwardIssue,
                        onIssueClick: onIssueClick,
                        onDelete: onDelete,
                    },
                };
            })}
        />
    );
};
