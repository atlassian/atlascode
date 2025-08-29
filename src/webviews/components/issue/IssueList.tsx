import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { IssueLinkIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { colorToLozengeAppearanceMap } from '../colors';

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

        const currentLozColor = colorToLozengeAppearanceMap[currentOption.colorName];

        return (
            <div style={{ width: '120px' }}>
                <DropdownMenu
                    trigger={({ triggerRef, ...props }) => (
                        <Button
                            {...props}
                            ref={triggerRef}
                            appearance="subtle"
                            style={{ padding: '4px 8px', minHeight: '32px', width: '100%' }}
                        >
                            <Lozenge appearance={currentLozColor}>{currentOption.label}</Lozenge>
                        </Button>
                    )}
                    placement="bottom-start"
                >
                    <DropdownItemGroup>
                        {statusOptions.map((option) => {
                            const lozColor = colorToLozengeAppearanceMap[option.colorName];
                            const isSelected = option.value === currentOption.value;

                            return (
                                <DropdownItem
                                    key={option.value}
                                    onClick={() => {
                                        if (data.onStatusChange) {
                                            data.onStatusChange(data.issue.key, option.value);
                                        }
                                    }}
                                    isSelected={isSelected}
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
                columns={[IssueKey, Summary, Priority, StatusColumn]}
                columnWidths={['150px', '100%', '20px', '140px']}
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
