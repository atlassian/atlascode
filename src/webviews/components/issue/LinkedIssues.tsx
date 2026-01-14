import Button from '@atlaskit/button';
import CrossIcon from '@atlaskit/icon/core/cross';
import InlineDialog from '@atlaskit/inline-dialog';
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
    issueLinkId: string;
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

const Actions = (data: ItemData) => {
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteClick = () => {
        setIsDeleting(true);
    };

    const handleConfirmDelete = () => {
        data.onDelete({ id: data.issueLinkId });
        setIsDeleting(false);
    };

    const handleCancelDelete = () => {
        setIsDeleting(false);
    };

    return (
        <div className={`ac-inline-dialog ${isDeleting ? 'active' : ''}`}>
            <InlineDialog
                content={
                    <div style={{ padding: '0' }}>
                        <p
                            style={{
                                color: 'var(--vscode-foreground)',
                                margin: '0 0 16px 0',
                                fontSize: '14px',
                                lineHeight: '1.4',
                            }}
                        >
                            Are you sure you want to remove this linked issue?
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <Button appearance="subtle" onClick={handleCancelDelete} spacing="compact">
                                Cancel
                            </Button>
                            <Button appearance="danger" onClick={handleConfirmDelete} spacing="compact">
                                Remove
                            </Button>
                        </div>
                    </div>
                }
                isOpen={isDeleting}
                onClose={handleCancelDelete}
                placement="left-end"
            >
                <Tooltip content="Unlink work item" position="top">
                    <span
                        onClick={handleDeleteClick}
                        role="button"
                        tabIndex={0}
                        aria-label="Unlink work item"
                        onKeyDown={(e) => e.key === 'Enter' && handleDeleteClick()}
                        style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                            borderRadius: '3px',
                            color: 'var(--vscode-descriptionForeground)',
                            opacity: 0.7,
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                    >
                        <CrossIcon size="small" label="Remove" />
                    </span>
                </Tooltip>
            </InlineDialog>
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
            columns={[IssueKey, Summary, Priority, AssigneeColumn, StatusColumn, Actions]}
            columnWidths={['100%', '100%', '20px', '100%', '150px', '20px']}
            items={issuelinks.map((issuelink) => {
                return {
                    id: issuelink.id,
                    content: {
                        linkDescription: issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward,
                        issue: issuelink.inwardIssue || issuelink.outwardIssue,
                        issueLinkId: issuelink.id,
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
