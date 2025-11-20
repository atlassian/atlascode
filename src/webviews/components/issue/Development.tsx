import Button from '@atlaskit/button';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import { Box } from '@mui/material';
import React from 'react';

export interface DevelopmentInfo {
    branches: any[];
    commits: any[];
    pullRequests: any[];
    builds: any[];
}

interface DevelopmentProps {
    developmentInfo: DevelopmentInfo;
    onOpenPullRequest: (pr: any) => void;
    onOpenExternalUrl: (url: string) => void;
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

const BranchList: React.FC<{ branches: any[]; onOpenExternalUrl: (url: string) => void }> = ({
    branches,
    onOpenExternalUrl,
}) => {
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
                    {branch.url ? (
                        <Button
                            appearance="link"
                            onClick={() => onOpenExternalUrl(branch.url)}
                            style={{ padding: 0, height: 'auto', fontSize: '13px' }}
                        >
                            {branch.name}
                        </Button>
                    ) : (
                        <span>{branch.name}</span>
                    )}
                </div>
            ))}
        </Box>
    );
};

const CommitList: React.FC<{ commits: any[]; onOpenExternalUrl: (url: string) => void }> = ({
    commits,
    onOpenExternalUrl,
}) => {
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
                        {commit.url ? (
                            <Button
                                appearance="link"
                                onClick={() => onOpenExternalUrl(commit.url)}
                                style={{ padding: 0, height: 'auto', fontSize: '13px', textAlign: 'left' }}
                            >
                                {commit.message?.split('\n')[0] || 'No message'}
                            </Button>
                        ) : (
                            <div>{commit.message?.split('\n')[0] || 'No message'}</div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                            {commit.hash?.substring(0, 7)} by {commit.authorName || 'Unknown'}
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
                    onOpen(pr);
                };

                return (
                    <div
                        key={pr.id || index}
                        style={{
                            display: 'flex',
                            padding: '4px 0',
                            fontSize: '13px',
                            gap: '8px',
                        }}
                    >
                        <DevelopmentIcon type="pr" />
                        <span
                            style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background:
                                    pr.state === 'OPEN'
                                        ? 'var(--vscode-statusBarItem-warningBackground)'
                                        : pr.state === 'MERGED'
                                          ? 'var(--vscode-statusBarItem-prominentBackground)'
                                          : 'var(--vscode-statusBarItem-errorBackground)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {pr.state}
                        </span>
                        <Button appearance="link" onClick={handleClick} style={{ padding: 0, height: 'auto' }}>
                            #{pr.id} - {pr.title || `Pull request #${pr.id}`}
                        </Button>
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

export const Development: React.FC<DevelopmentProps> = ({ developmentInfo, onOpenPullRequest, onOpenExternalUrl }) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

    const { branches, commits, pullRequests, builds } = developmentInfo;

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const totalCount =
        (branches?.length || 0) + (commits?.length || 0) + (pullRequests?.length || 0) + (builds?.length || 0);

    if (totalCount === 0) {
        return null;
    }

    const summaryParts = [];
    if (branches.length > 0) {
        summaryParts.push(`${branches.length} branch${branches.length > 1 ? 'es' : ''}`);
    }
    if (commits.length > 0) {
        summaryParts.push(`${commits.length} commit${commits.length > 1 ? 's' : ''}`);
    }
    if (pullRequests.length > 0) {
        summaryParts.push(`${pullRequests.length} pull request${pullRequests.length > 1 ? 's' : ''}`);
    }
    if (builds.length > 0) {
        summaryParts.push(`${builds.length} build${builds.length > 1 ? 's' : ''}`);
    }
    const summaryText = summaryParts.join(', ');

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {/* Summary row with chevron and text */}
            <Box style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Button
                    appearance="subtle"
                    onClick={() => setIsOpen(!isOpen)}
                    iconBefore={
                        isOpen ? (
                            <ChevronDownIcon label="Collapse" size="small" />
                        ) : (
                            <ChevronRightIcon label="Expand" size="small" />
                        )
                    }
                    style={{
                        padding: 0,
                        height: 'auto',
                        minHeight: '20px',
                        minWidth: '20px',
                    }}
                />
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        fontSize: '13px',
                        color: 'var(--vscode-foreground)',
                        cursor: 'pointer',
                    }}
                >
                    {summaryText}
                </div>
            </Box>

            {/* Expandable sections */}
            {isOpen && (
                <Box style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', width: '60%' }}>
                    <DevelopmentItem
                        icon="branch"
                        count={branches.length}
                        label="branch"
                        isExpanded={expandedSection === 'branches'}
                        onToggle={() => toggleSection('branches')}
                    />
                    {expandedSection === 'branches' && (
                        <BranchList branches={branches} onOpenExternalUrl={onOpenExternalUrl} />
                    )}

                    <DevelopmentItem
                        icon="commit"
                        count={commits.length}
                        label="commit"
                        isExpanded={expandedSection === 'commits'}
                        onToggle={() => toggleSection('commits')}
                    />
                    {expandedSection === 'commits' && (
                        <CommitList commits={commits} onOpenExternalUrl={onOpenExternalUrl} />
                    )}

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
            )}
        </Box>
    );
};
