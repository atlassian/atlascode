import Button from '@atlaskit/button';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import { Box } from '@mui/material';
import React from 'react';

import { PullRequestData } from '../../../bitbucket/model';

export interface DevelopmentInfo {
    branches: any[]; // Can be Git Branch or simplified branch object from Jira API
    commits: any[]; // Can be Git Commit or simplified commit object from Jira API
    pullRequests: any[]; // Can be PullRequestData or simplified PR from Jira API
    builds: any[]; // Can be BuildStatus or simplified build from Jira API
}

interface DevelopmentProps {
    developmentInfo: DevelopmentInfo;
    onOpenPullRequest: (pr: PullRequestData) => void;
}

const DevelopmentIcon: React.FC<{ type: string }> = ({ type }) => {
    const iconStyle = {
        width: '16px',
        height: '16px',
        marginRight: '8px',
    };

    switch (type) {
        case 'branch':
            return (
                <svg style={iconStyle} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
                </svg>
            );
        case 'commit':
            return (
                <svg style={iconStyle} viewBox="0 0 16 16" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"
                    />
                </svg>
            );
        case 'pr':
            return (
                <svg style={iconStyle} viewBox="0 0 16 16" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
                    />
                </svg>
            );
        case 'build':
            return (
                <svg style={iconStyle} viewBox="0 0 16 16" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
                    />
                </svg>
            );
        default:
            return null;
    }
};

const DevelopmentItem: React.FC<{
    icon: string;
    count: number;
    label: string;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ icon, count, label, isExpanded, onToggle }) => {
    if (count === 0) {
        return null;
    }

    return (
        <Button
            appearance="subtle"
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                justifyContent: 'flex-start',
                width: '100%',
                color: 'var(--vscode-textLink-foreground)',
            }}
        >
            <DevelopmentIcon type={icon} />
            <span>
                {count} {label}
                {count > 1 ? 's' : ''}
            </span>
        </Button>
    );
};

const BranchList: React.FC<{ branches: any[] }> = ({ branches }) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {branches.map((branch, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: '13px',
                    }}
                >
                    <DevelopmentIcon type="branch" />
                    <span>{branch.name}</span>
                    {branch.url && (
                        <Button
                            appearance="subtle"
                            spacing="none"
                            onClick={() => window.open(branch.url, '_blank')}
                            style={{ marginLeft: '8px', padding: '0 4px', height: 'auto', fontSize: '11px' }}
                        >
                            View
                        </Button>
                    )}
                </div>
            ))}
        </Box>
    );
};

const CommitList: React.FC<{ commits: any[] }> = ({ commits }) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {commits.slice(0, 5).map((commit, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '4px 0',
                        fontSize: '13px',
                    }}
                >
                    <DevelopmentIcon type="commit" />
                    <div style={{ flex: 1 }}>
                        <div>{commit.message?.split('\n')[0] || 'No message'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                            {commit.hash?.substring(0, 7)} by {commit.authorName || 'Unknown'}
                            {commit.url && (
                                <Button
                                    appearance="link"
                                    spacing="none"
                                    onClick={() => window.open(commit.url, '_blank')}
                                    style={{ marginLeft: '8px', padding: 0, height: 'auto', fontSize: '11px' }}
                                >
                                    View
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {commits.length > 5 && (
                <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginLeft: '24px' }}>
                    And {commits.length - 5} more...
                </div>
            )}
        </Box>
    );
};

const PullRequestList: React.FC<{ pullRequests: any[]; onOpen: (pr: any) => void }> = ({ pullRequests, onOpen }) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {pullRequests.map((pr, index) => {
                const handleClick = () => {
                    if (pr.url && !pr.data) {
                        // If it's a simplified PR from Jira API with just a URL, open it
                        window.open(pr.url, '_blank');
                    } else {
                        // Otherwise use the existing onOpen handler
                        onOpen(pr);
                    }
                };

                return (
                    <div
                        key={pr.id || index}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 0',
                            fontSize: '13px',
                        }}
                    >
                        <DevelopmentIcon type="pr" />
                        <Button appearance="link" onClick={handleClick} style={{ padding: 0, height: 'auto' }}>
                            #{pr.id} - {pr.title || `Pull request #${pr.id}`}
                        </Button>
                        <span
                            style={{
                                marginLeft: '8px',
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background:
                                    pr.state === 'OPEN'
                                        ? 'var(--vscode-statusBarItem-warningBackground)'
                                        : pr.state === 'MERGED'
                                          ? 'var(--vscode-statusBarItem-prominentBackground)'
                                          : 'var(--vscode-statusBarItem-errorBackground)',
                            }}
                        >
                            {pr.state}
                        </span>
                    </div>
                );
            })}
        </Box>
    );
};

const BuildList: React.FC<{ builds: any[] }> = ({ builds }) => {
    const getStatusIcon = (state: string) => {
        if (state === 'SUCCESSFUL') {
            return (
                <span style={{ color: 'var(--vscode-testing-iconPassed)' }}>
                    <CheckCircleIcon label="Success" size="small" />
                </span>
            );
        }
        return (
            <span style={{ color: 'var(--vscode-testing-iconFailed)' }}>
                <CrossCircleIcon label="Failed" size="small" />
            </span>
        );
    };

    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {builds.map((build, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: '13px',
                    }}
                >
                    {getStatusIcon(build.state)}
                    <span style={{ marginLeft: '8px' }}>{build.name || build.key}</span>
                </div>
            ))}
        </Box>
    );
};

export const Development: React.FC<DevelopmentProps> = ({ developmentInfo, onOpenPullRequest }) => {
    const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

    console.log('[DEV_INFO] Development component rendering with:', developmentInfo);

    const { branches, commits, pullRequests, builds } = developmentInfo;

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const totalCount =
        (branches?.length || 0) + (commits?.length || 0) + (pullRequests?.length || 0) + (builds?.length || 0);

    console.log('[DEV_INFO] Development component total count:', totalCount);

    if (totalCount === 0) {
        return (
            <div style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
                No development information
            </div>
        );
    }

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <DevelopmentItem
                icon="branch"
                count={branches.length}
                label="branch"
                isExpanded={expandedSection === 'branches'}
                onToggle={() => toggleSection('branches')}
            />
            {expandedSection === 'branches' && <BranchList branches={branches} />}

            <DevelopmentItem
                icon="commit"
                count={commits.length}
                label="commit"
                isExpanded={expandedSection === 'commits'}
                onToggle={() => toggleSection('commits')}
            />
            {expandedSection === 'commits' && <CommitList commits={commits} />}

            <DevelopmentItem
                icon="pr"
                count={pullRequests.length}
                label="pull request"
                isExpanded={expandedSection === 'pullRequests'}
                onToggle={() => toggleSection('pullRequests')}
            />
            {expandedSection === 'pullRequests' && (
                <PullRequestList pullRequests={pullRequests} onOpen={onOpenPullRequest} />
            )}

            <DevelopmentItem
                icon="build"
                count={builds.length}
                label="build"
                isExpanded={expandedSection === 'builds'}
                onToggle={() => toggleSection('builds')}
            />
            {expandedSection === 'builds' && <BuildList builds={builds} />}
        </Box>
    );
};
