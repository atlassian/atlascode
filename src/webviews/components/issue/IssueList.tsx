import Button from '@atlaskit/button';
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
};

const IssueKey = (data: ItemData) => (
    <div className="ac-flex-space-between">
        <div style={{ width: '16px', height: '16px' }}>
            <Tooltip content={data.issue.issuetype.name}>
                <img src={data.issue.issuetype.iconUrl} />
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

export default class IssueList extends React.Component<
    {
        issues: IssueLinkIssue<DetailedSiteInfo>[];
        onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
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
                        },
                    };
                })}
            />
        );
    }
}
