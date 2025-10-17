import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { colorToLozengeAppearanceMap } from '../colors';

type ItemData = {
    issue: IssueLinkIssue<DetailedSiteInfo>;
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onStatusChange?: (issueKey: string, statusName: string) => void;
};

export const AssigneeColumn = (data: ItemData) => {
    const assignee = (data.issue as any).assignee;
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
