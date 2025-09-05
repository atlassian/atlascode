import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
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
                columnWidths={['150px', '100%', '20px', '150px']}
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
