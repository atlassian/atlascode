import AiChatIcon from '@atlaskit/icon/core/ai-chat';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { ActionItem } from './action-item/ActionItem';
import { JiraWorkItem } from './jira-work-item/JiraWorkItem';

const titleStyles: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '10px',
    color: 'var(--vscode-descriptionForeground)',
    textAlign: 'left',
};

export const RovoDevActions: React.FC<{
    setPromptText: (context: string) => void;
}> = ({ setPromptText }) => {
    return (
        <div style={{ marginTop: '32px', width: '100%', maxWidth: '270px' }}>
            <div style={titleStyles}>Actions</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <ActionItem
                    icon={<AiChatIcon size="small" spacing="none" label="Explain this repository" />}
                    text="Explain this repository"
                    onClick={() => setPromptText('Explain this repository')}
                />
                <ActionItem
                    icon={<AiChatIcon size="small" spacing="none" label="Find bugs in this repository" />}
                    text="Find bugs in this repository"
                    onClick={() => setPromptText('Find bugs in this repository')}
                />
                <ActionItem
                    icon={<AiChatIcon size="small" spacing="none" label="List my assigned Jira work items" />}
                    text="List my assigned Jira work items"
                    onClick={() => setPromptText('List my assigned Jira work items')}
                />
            </div>
        </div>
    );
};

export const RovoDevJiraWorkItems: React.FC<{
    jiraWorkItems: MinimalIssue<DetailedSiteInfo>[] | undefined;
    onJiraItemClick: (issue: MinimalIssue<DetailedSiteInfo>) => void;
}> = ({ jiraWorkItems, onJiraItemClick }) => {
    // hide the entire thing if there are no Jira items to display
    if (jiraWorkItems !== undefined && jiraWorkItems.length === 0) {
        return null;
    }

    return (
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '270px' }}>
            <div style={titleStyles}>Jira Work Items</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {jiraWorkItems === undefined && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            color: 'var(--vscode-descriptionForeground)',
                        }}
                    >
                        <i className="codicon codicon-loading codicon-modifier-spin" />
                        <span>Loading work items...</span>
                    </div>
                )}
                {jiraWorkItems !== undefined &&
                    jiraWorkItems.map((issue) => (
                        <JiraWorkItem
                            key={issue.key}
                            issueKey={issue.key}
                            summary={issue.summary}
                            issueTypeIconUrl={issue.issuetype?.iconUrl}
                            issueTypeName={issue.issuetype?.name}
                            onClick={() => onJiraItemClick(issue)}
                        />
                    ))}
            </div>
        </div>
    );
};
