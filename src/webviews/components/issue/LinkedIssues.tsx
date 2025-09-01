import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
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

const Summary = (data: ItemData) => <p style={{ display: 'inline' }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => {
    if (!data.issue.priority || !data.issue.priority.name || !data.issue.priority.iconUrl) {
        return <React.Fragment />;
    }

    return (
        <div style={{ width: '16px', height: '16px' }}>
            <Tooltip content={data.issue.priority.name}>
                <img src={data.issue.priority.iconUrl} alt={data.issue.priority.name} />
            </Tooltip>
        </div>
    );
};

const StatusColumn = (data: ItemData) => {
    if (!data.issue.status || !data.issue.status.statusCategory) {
        return <React.Fragment />;
    }

    if (data.onStatusChange) {
        const currentStatus = data.issue.status.name;
        const statusOptions = [
            { label: 'TO DO', value: 'To Do', colorName: 'new' },
            { label: 'IN PROGRESS', value: 'In Progress', colorName: 'indeterminate' },
            { label: 'DONE', value: 'Done', colorName: 'done' },
        ];

        const currentOption =
            statusOptions.find(
                (option) =>
                    currentStatus.toLowerCase().includes(option.value.toLowerCase()) ||
                    (option.value === 'To Do' && currentStatus.toLowerCase().includes('todo')) ||
                    (option.value === 'In Progress' && currentStatus.toLowerCase().includes('progress')),
            ) || statusOptions[0];

        return (
            <div style={{ width: '120px', fontSize: '11px' }}>
                <DropdownMenu
                    trigger={({ triggerRef, ...props }) => (
                        <Button
                            {...props}
                            ref={triggerRef}
                            appearance="subtle"
                            style={{ padding: '4px 8px', minHeight: '32px', width: '100%' }}
                            iconAfter={<ChevronDownIcon label="" size="small" />}
                        >
                            {currentOption.label}
                        </Button>
                    )}
                    placement="bottom-start"
                >
                    <DropdownItemGroup>
                        {statusOptions
                            .filter((option) => option.value !== currentOption.value)
                            .map((option) => {
                                const lozColor = colorToLozengeAppearanceMap[option.colorName];

                                return (
                                    <DropdownItem
                                        key={option.value}
                                        onClick={() => {
                                            if (data.onStatusChange) {
                                                data.onStatusChange(data.issue.key, option.value);
                                            }
                                        }}
                                    >
                                        <Lozenge appearance={lozColor}>{option.label}</Lozenge>
                                    </DropdownItem>
                                );
                            })}
                    </DropdownItemGroup>
                </DropdownMenu>
            </div>
        );
    }

    const lozColor: string = colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName];
    return <Lozenge appearance={lozColor}>{data.issue.status.name}</Lozenge>;
};
// const Delete = (data: ItemData) => {
//     return (<div className='ac-delete' onClick={() => data.onDelete(data.issue)}>
//         <TrashIcon label='trash' />
//     </div>);
// };

export const LinkedIssues: React.FunctionComponent<LinkedIssuesProps> = ({
    issuelinks,
    onIssueClick,
    onDelete,
    onStatusChange,
}) => {
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
                        onStatusChange: onStatusChange,
                    },
                };
            })}
        />
    );
};
