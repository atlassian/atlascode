import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueOrKeyAndSite, User } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { colorToLozengeAppearanceMap } from '../colors';

type ItemData = {
    issue: IssueLinkIssue<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
    onAssigneeChange?: (issueKey: string, assignee: User | null) => void;
    fetchUsers?: (input: string) => Promise<User[]>;
};

export const AssigneeColumn = (data: ItemData) => {
    const assignee = (data.issue as any).assignee;
    const { fetchUsers } = data;
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const [users, setUsers] = React.useState<User[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const searchUsers = React.useCallback(
        async (query: string) => {
            if (!fetchUsers || query.length < 2) {
                setUsers([]);
                return;
            }
            setIsLoading(true);
            try {
                const results = await fetchUsers(query);
                setUsers(results);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        },
        [fetchUsers],
    );

    React.useEffect(() => {
        if (searchText) {
            const timeoutId = setTimeout(() => {
                searchUsers(searchText);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setUsers([]);
        }
        return undefined;
    }, [searchText, searchUsers]);

    const handleAssigneeSelect = (user: User | null) => {
        if (data.onAssigneeChange) {
            data.onAssigneeChange(data.issue.key, user);
        }
        setIsOpen(false);
        setSearchText('');
        setUsers([]);
    };

    if (!data.onAssigneeChange || !data.fetchUsers) {
        // Read-only mode
        if (!assignee) {
            return <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Unassigned</span>;
        }

        const label: string = assignee.displayName ?? assignee.name;
        const avatar = assignee.avatarUrls && assignee.avatarUrls['24x24'] ? assignee.avatarUrls['24x24'] : '';

        return (
            <div className="ac-flex" style={{ alignItems: 'center' }}>
                <Avatar size="small" src={avatar} />
                <span style={{ marginLeft: '4px' }}>{label}</span>
            </div>
        );
    }

    // Editable mode
    const label: string = assignee ? (assignee.displayName ?? assignee.name) : 'Unassigned';
    const avatar = assignee?.avatarUrls && assignee.avatarUrls['24x24'] ? assignee.avatarUrls['24x24'] : '';

    return (
        <div style={{ width: '150px', minWidth: '140px' }}>
            <DropdownMenu
                isOpen={isOpen}
                onOpenChange={(attrs) => setIsOpen(attrs.isOpen)}
                trigger={({ triggerRef, ...props }) => (
                    <Button
                        {...props}
                        ref={triggerRef}
                        appearance="subtle"
                        style={{
                            padding: '4px 6px',
                            minHeight: '32px',
                            width: '100%',
                            justifyContent: 'flex-start',
                        }}
                        iconAfter={<ChevronDownIcon label="" size="small" />}
                    >
                        <div className="ac-flex" style={{ alignItems: 'center' }}>
                            {assignee && <Avatar size="xsmall" src={avatar} />}
                            <span style={{ marginLeft: assignee ? '4px' : '0', fontSize: '12px' }}>{label}</span>
                        </div>
                    </Button>
                )}
                placement="bottom-start"
            >
                <div style={{ padding: '8px', minWidth: '200px' }}>
                    <Textfield
                        placeholder="Search users..."
                        value={searchText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                        autoFocus
                    />
                </div>
                <DropdownItemGroup>
                    {assignee && (
                        <DropdownItem onClick={() => handleAssigneeSelect(null)}>
                            <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Unassign</span>
                        </DropdownItem>
                    )}
                    {isLoading && (
                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
                            <Spinner size="small" />
                        </div>
                    )}
                    {!isLoading &&
                        users.map((user, index) => {
                            const userAvatar =
                                user.avatarUrls && user.avatarUrls['24x24'] ? user.avatarUrls['24x24'] : '';
                            return (
                                <DropdownItem
                                    key={user.accountId || `user-${index}`}
                                    onClick={() => handleAssigneeSelect(user)}
                                >
                                    <div className="ac-flex" style={{ alignItems: 'center' }}>
                                        <Avatar size="xsmall" src={userAvatar} />
                                        <span style={{ marginLeft: '8px' }}>{user.displayName}</span>
                                    </div>
                                </DropdownItem>
                            );
                        })}
                    {!isLoading && searchText.length >= 2 && users.length === 0 && (
                        <div
                            style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--vscode-descriptionForeground)',
                            }}
                        >
                            No users found
                        </div>
                    )}
                    {!isLoading && searchText.length < 2 && searchText.length > 0 && (
                        <div
                            style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--vscode-descriptionForeground)',
                            }}
                        >
                            Type at least 2 characters
                        </div>
                    )}
                </DropdownItemGroup>
            </DropdownMenu>
        </div>
    );
};

export const StatusColumn = (data: ItemData) => {
    if (!data.issue.status || !data.issue.status.statusCategory) {
        return <React.Fragment />;
    }

    if (data.onStatusChange) {
        const currentStatus = data.issue.status.name;
        const currentLozColor = colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName] || 'default';

        const transitions = (data.issue as any).transitions || [];

        const validTransitions = transitions.filter((transition: any) => transition.to.id !== data.issue.status.id);

        if (validTransitions.length === 0) {
            return <Lozenge appearance={currentLozColor}>{currentStatus}</Lozenge>;
        }

        return (
            <div style={{ width: '150px', fontSize: '12px', minWidth: '140px' }}>
                <DropdownMenu
                    trigger={({ triggerRef, ...props }) => (
                        <Button
                            {...props}
                            ref={triggerRef}
                            appearance="subtle"
                            style={{
                                padding: '4px 6px',
                                minHeight: '32px',
                            }}
                            iconAfter={<ChevronDownIcon label="" size="small" />}
                        >
                            <Lozenge appearance={currentLozColor}>{currentStatus}</Lozenge>
                        </Button>
                    )}
                    placement="bottom-start"
                >
                    <DropdownItemGroup>
                        {validTransitions.map((transition: any) => {
                            const lozColor =
                                colorToLozengeAppearanceMap[transition.to.statusCategory.colorName] || 'default';

                            return (
                                <DropdownItem
                                    key={transition.id}
                                    onClick={() => {
                                        if (data.onStatusChange) {
                                            data.onStatusChange(data.issue.key, transition.to.name);
                                        }
                                    }}
                                >
                                    <Lozenge appearance={lozColor}>{transition.to.name}</Lozenge>
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

export const Summary = (data: ItemData) => <p style={{ display: 'inline' }}>{data.issue.summary}</p>;

export const Priority = (data: ItemData) => {
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
