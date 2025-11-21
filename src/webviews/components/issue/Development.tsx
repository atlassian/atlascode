import Button from '@atlaskit/button';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Box } from '@mui/material';
import React from 'react';

import { PullRequestData } from '../../../bitbucket/model';
import { BranchInfo, BuildInfo, CommitInfo, DevelopmentInfo } from '../../../ipc/issueMessaging';

interface DevelopmentProps {
    developmentInfo: DevelopmentInfo;
    onOpenPullRequest: (pr: PullRequestData) => void;
    onOpenExternalUrl: (url: string) => void;
}

/**
 * Utility function to get the plural form of a label based on count
 */
const getPluralLabel = (baseLabel: string, count: number): string => {
    if (count === 1) {
        return baseLabel;
    }
    if (baseLabel === 'branch') {
        return 'branches';
    }
    return baseLabel + 's';
};

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
    onClick: () => void;
}> = ({ icon, count, label, onClick }) => {
    if (count === 0) {
        return null;
    }

    return (
        <Button
            appearance="link"
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                justifyContent: 'flex-start',
                color: 'var(--vscode-textLink-foreground)',
                textDecoration: 'none',
            }}
        >
            <DevelopmentIcon type={icon} />
            <span>
                {count} {getPluralLabel(label, count)}
            </span>
        </Button>
    );
};

const BranchList: React.FC<{ branches: BranchInfo[]; onOpenExternalUrl: (url: string) => void }> = ({
    branches,
    onOpenExternalUrl,
}) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {branches.map((branch) => (
                <div
                    key={branch.name}
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
                            onClick={() => onOpenExternalUrl(branch.url!)}
                            style={{
                                padding: 0,
                                height: 'auto',
                                fontSize: '13px',
                                maxWidth: '400px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {branch.name}
                        </Button>
                    ) : (
                        <span
                            style={{
                                maxWidth: '400px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                            }}
                        >
                            {branch.name}
                        </span>
                    )}
                </div>
            ))}
        </Box>
    );
};

const CommitList: React.FC<{ commits: CommitInfo[]; onOpenExternalUrl: (url: string) => void }> = ({
    commits,
    onOpenExternalUrl,
}) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {commits.map((commit) => {
                const commitMessage = commit.message?.split('\n')[0] || 'No message';
                return (
                    <div
                        key={commit.hash}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '4px 0',
                            fontSize: '13px',
                        }}
                    >
                        <DevelopmentIcon type="commit" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {commit.url ? (
                                <Button
                                    appearance="link"
                                    onClick={() => onOpenExternalUrl(commit.url!)}
                                    style={{
                                        padding: 0,
                                        height: 'auto',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'block',
                                    }}
                                >
                                    {commitMessage}
                                </Button>
                            ) : (
                                <div
                                    style={{
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {commitMessage}
                                </div>
                            )}
                            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                {commit.hash?.substring(0, 7)} by {commit.authorName || 'Unknown'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </Box>
    );
};

const PullRequestList: React.FC<{ pullRequests: PullRequestData[]; onOpen: (pr: PullRequestData) => void }> = ({
    pullRequests,
    onOpen,
}) => {
    return (
        <Box style={{ marginLeft: '24px', marginTop: '4px' }}>
            {pullRequests.map((pr, index) => {
                const handleClick = () => {
                    onOpen(pr);
                };
                const prTitle = `#${pr.id} - ${pr.title || `Pull request #${pr.id}`}`;

                return (
                    <div
                        key={pr.id || index}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 0',
                            fontSize: '13px',
                            gap: '8px',
                            minWidth: 0,
                        }}
                    >
                        <DevelopmentIcon type="pr" />
                        <span
                            style={{
                                fontSize: '11px',
                                color: 'var(--vscode-foreground)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background:
                                    pr.state === 'OPEN'
                                        ? 'var(--vscode-statusBarItem-prominentHoverBackground)'
                                        : pr.state === 'MERGED'
                                          ? 'var(--vscode-statusBarItem-prominentBackground)'
                                          : 'var(--vscode-statusBarItem-errorBackground)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {pr.state}
                        </span>
                        <Button
                            appearance="link"
                            onClick={handleClick}
                            style={{
                                padding: 0,
                                height: 'auto',
                                maxWidth: '350px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {prTitle}
                        </Button>
                    </div>
                );
            })}
        </Box>
    );
};

const BuildList: React.FC<{ builds: BuildInfo[] }> = ({ builds }) => {
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
                    key={build.key || build.name || index}
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
    const [openModal, setOpenModal] = React.useState<'branches' | 'commits' | 'pullRequests' | 'builds' | null>(null);

    const { branches, commits, pullRequests, builds } = developmentInfo;

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

    const getModalTitle = () => {
        switch (openModal) {
            case 'branches':
                return `Branches (${branches.length})`;
            case 'commits':
                return `Commits (${commits.length})`;
            case 'pullRequests':
                return `Pull Requests (${pullRequests.length})`;
            case 'builds':
                return `Builds (${builds.length})`;
            default:
                return '';
        }
    };

    const getModalContent = () => {
        switch (openModal) {
            case 'branches':
                return <BranchList branches={branches} onOpenExternalUrl={onOpenExternalUrl} />;
            case 'commits':
                return <CommitList commits={commits} onOpenExternalUrl={onOpenExternalUrl} />;
            case 'pullRequests':
                return <PullRequestList pullRequests={pullRequests} onOpen={onOpenPullRequest} />;
            case 'builds':
                return <BuildList builds={builds} />;
            default:
                return null;
        }
    };

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

            {/* Clickable items that open modals - only show when expanded */}
            {isOpen && (
                <Box style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <DevelopmentItem
                        icon="branch"
                        count={branches.length}
                        label="branch"
                        onClick={() => setOpenModal('branches')}
                    />
                    <DevelopmentItem
                        icon="commit"
                        count={commits.length}
                        label="commit"
                        onClick={() => setOpenModal('commits')}
                    />
                    <DevelopmentItem
                        icon="pr"
                        count={pullRequests.length}
                        label="pull request"
                        onClick={() => setOpenModal('pullRequests')}
                    />
                    <DevelopmentItem
                        icon="build"
                        count={builds.length}
                        label="build"
                        onClick={() => setOpenModal('builds')}
                    />
                </Box>
            )}

            {/* Modal */}
            <ModalTransition>
                {openModal && (
                    <Modal onClose={() => setOpenModal(null)} width="large">
                        <ModalHeader>
                            <ModalTitle>{getModalTitle()}</ModalTitle>
                        </ModalHeader>
                        <ModalBody>{getModalContent()}</ModalBody>
                        <ModalFooter>
                            <Button appearance="subtle" onClick={() => setOpenModal(null)}>
                                Cancel
                            </Button>
                        </ModalFooter>
                    </Modal>
                )}
            </ModalTransition>
        </Box>
    );
};
