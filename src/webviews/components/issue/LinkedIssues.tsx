import Button from '@atlaskit/button';
import CrossIcon from '@atlaskit/icon/core/cross';
import InlineDialog from '@atlaskit/inline-dialog';
import Tooltip from '@atlaskit/tooltip';
import { MinimalIssueLink, MinimalIssueOrKeyAndSite, User } from '@atlassianlabs/jira-pi-common-models';
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

type RowProps = {
    issuelink: MinimalIssueLink<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
    onAssigneeChange?: (issueKey: string, assignee: User | null) => void;
    fetchUsers?: (input: string) => Promise<User[]>;
};

const LinkedIssueRow: React.FC<RowProps> = ({
    issuelink,
    onIssueClick,
    onDelete,
    onStatusChange,
    onAssigneeChange,
    fetchUsers,
}) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const issue = issuelink.inwardIssue || issuelink.outwardIssue;
    const linkDescription = issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward;

    if (!issue) {
        return null;
    }

    const handleDeleteClick = () => {
        setIsDeleting(true);
    };

    const handleConfirmDelete = () => {
        onDelete({ id: issuelink.id });
        setIsDeleting(false);
    };

    const handleCancelDelete = () => {
        setIsDeleting(false);
    };

    const itemData = {
        issue,
        onIssueClick,
        onStatusChange,
        onAssigneeChange,
        fetchUsers,
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderBottom: '1px solid var(--vscode-widget-border)',
                overflow: 'hidden',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Issue Key + Type */}
            <div style={{ flex: '0 0 100px', width: '100px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <em
                        style={{
                            fontSize: '10px',
                            fontStyle: 'italic',
                            color: 'var(--vscode-descriptionForeground)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {linkDescription}
                    </em>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {issue?.issuetype?.iconUrl && (
                            <Tooltip content={issue.issuetype.name || ''}>
                                <img
                                    src={issue.issuetype.iconUrl}
                                    alt={issue.issuetype.name || ''}
                                    style={{ width: '14px', height: '14px' }}
                                />
                            </Tooltip>
                        )}
                        <Button
                            appearance="subtle-link"
                            spacing="none"
                            onClick={() => onIssueClick({ siteDetails: issue.siteDetails, key: issue.key })}
                            style={{ padding: 0, fontSize: '12px' }}
                        >
                            {issue.key}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div style={{ flex: '1 1 60px', minWidth: '60px', overflow: 'hidden' }}>{Summary(itemData)}</div>

            {/* Priority */}
            <div style={{ flex: '0 0 24px', display: 'flex', justifyContent: 'center' }}>{Priority(itemData)}</div>

            {/* Assignee */}
            <div style={{ flex: '0 1 160px', minWidth: '100px' }}>{AssigneeColumn(itemData)}</div>

            {/* Status */}
            <div style={{ flex: '0 1 150px', minWidth: '90px' }}>{StatusColumn(itemData)}</div>

            {/* Delete button */}
            <div
                style={{
                    flex: '0 0 24px',
                    display: 'flex',
                    justifyContent: 'center',
                    visibility: isHovered || isDeleting ? 'visible' : 'hidden',
                }}
            >
                <div className={`ac-inline-dialog ${isDeleting ? 'active' : ''}`}>
                    <InlineDialog
                        content={
                            <div style={{ padding: '0' }}>
                                <p
                                    style={{
                                        color: 'var(--vscode-foreground)',
                                        margin: '0 0 8px 0',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }}
                                >
                                    Remove the link to {issue.key}?
                                </p>
                                <p
                                    style={{
                                        color: 'var(--vscode-descriptionForeground)',
                                        margin: '0 0 16px 0',
                                        fontSize: '13px',
                                    }}
                                >
                                    You can add it again later if you need to.
                                </p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <Button appearance="danger" onClick={handleConfirmDelete} spacing="compact">
                                        Remove
                                    </Button>
                                    <Button appearance="subtle" onClick={handleCancelDelete} spacing="compact">
                                        Cancel
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
                                    color: 'var(--vscode-foreground)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--vscode-errorForeground)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--vscode-foreground)';
                                }}
                            >
                                <CrossIcon size="small" label="Remove" />
                            </span>
                        </Tooltip>
                    </InlineDialog>
                </div>
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
        <div>
            {issuelinks.map((issuelink) => (
                <LinkedIssueRow
                    key={issuelink.id}
                    issuelink={issuelink}
                    onIssueClick={onIssueClick}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onAssigneeChange={onAssigneeChange}
                    fetchUsers={fetchUsers}
                />
            ))}
        </div>
    );
};
