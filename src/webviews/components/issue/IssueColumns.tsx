import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueOrKeyAndSite, User } from '@atlassianlabs/jira-pi-common-models';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import * as React from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import useConstant from 'use-constant';

import { colorToLozengeAppearanceMap } from '../colors';

const USER_SEARCH_DEBOUNCE_MS = 300;

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

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                if (!fetchUsers || query.length < 2) {
                    return [];
                }
                return await fetchUsers(query);
            },
            USER_SEARCH_DEBOUNCE_MS,
            { leading: false },
        ),
    );

    const fetchUsersResult = useAsyncAbortable(
        async (abortSignal) => {
            if (searchText.length >= 2) {
                try {
                    const results = await debouncedUserFetcher(searchText, abortSignal);
                    return results || [];
                } catch (error) {
                    console.warn('Failed to fetch users:', error);
                    throw error; // Re-throw to let useAsyncAbortable handle error state
                }
            }
            return [];
        },
        [searchText],
    );

    const users = fetchUsersResult.result || [];
    const isLoading = fetchUsersResult.loading;
    const hasError = fetchUsersResult.error !== undefined;

    const handleAssigneeSelect = (user: User | null) => {
        if (data.onAssigneeChange) {
            data.onAssigneeChange(data.issue.key, user);
        }
        setIsOpen(false);
        setSearchText('');
    };

    if (!data.onAssigneeChange || !data.fetchUsers) {
        // Read-only mode
        if (!assignee) {
            return <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Unassigned</span>;
        }

        const label: string = assignee.displayName ?? assignee.name;
        const avatar = assignee.avatarUrls && assignee.avatarUrls['24x24'] ? assignee.avatarUrls['24x24'] : '';

        return (
            <div className="ac-flex" style={{ alignItems: 'flex-start', gap: '4px', maxWidth: '180px' }}>
                <Avatar size="small" src={avatar} style={{ flexShrink: 0 }} />
                <span
                    style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: '1.2',
                        fontSize: '12px',
                    }}
                >
                    {label}
                </span>
            </div>
        );
    }

    // Editable mode
    const label: string = assignee ? (assignee.displayName ?? assignee.name) : 'Unassigned';
    const avatar = assignee?.avatarUrls && assignee.avatarUrls['24x24'] ? assignee.avatarUrls['24x24'] : '';

    return (
        <div style={{ width: '180px', minWidth: '140px' }}>
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
                        }}
                        iconAfter={<ChevronDownIcon label="" size="small" />}
                    >
                        <span className="ac-flex" style={{ alignItems: 'center', gap: '3px' }}>
                            {(assignee && <Avatar size="xsmall" src={avatar} style={{ flexShrink: 0 }} />) || (
                                <div style={{ height: '16px' }} />
                            )}
                            <span style={{ fontSize: '12px', lineHeight: '12px' }}>{label}</span>
                        </span>
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
                        !hasError &&
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
                    {!isLoading && !hasError && searchText.length >= 2 && users.length === 0 && (
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
                    {!isLoading && hasError && searchText.length >= 2 && (
                        <div
                            style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--vscode-errorForeground)',
                            }}
                        >
                            Failed to load users
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

export const Summary = (data: ItemData) => (
    <Tooltip content={data.issue.summary}>
        <p
            style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
                lineHeight: '1.4',
            }}
        >
            {data.issue.summary}
        </p>
    </Tooltip>
);

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
