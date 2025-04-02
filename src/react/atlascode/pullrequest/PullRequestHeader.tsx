import React from 'react';
import PageHeader from '@atlaskit/page-header';
import Breadcrumbs from '@atlaskit/breadcrumbs';
import { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import { formatTime } from '../util/date-fns';
import { PullRequestHeaderActions } from './PullRequestHeaderActions';
import StateLozenge from './StateLozenge';
import { EditableTitle } from './EditableTitle';
import { SourceCheckoutButton } from './SourceCheckoutButton';
import { ButtonGroup } from '@atlaskit/button';
import { RefreshButton } from './RefreshButton';
import { Flex } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { ApprovalStatus } from 'src/bitbucket/model';
import { token } from '@atlaskit/tokens';
import { Theme } from '@material-ui/core';
import { makeStyles } from '@material-ui/core';
import { BranchTag } from './BranchTag';
import Link from '@atlaskit/link';
import UserAvatar from './UserAvatar';

interface PullRequestHeaderProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    currentUserApprovalStatus: ApprovalStatus;
    isSomethingLoading: () => boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
    prHeaderBottomBar: {
        marginBottom: token('space.200'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    prHeaderPrAuthor: {
        display: 'flex',
        alignItems: 'center',
        marginRight: token('space.200'),
    },

    breadcrumb: {
        // To override the default background color of the breadcrumb set by atlaskit
        backgroundColor: 'unset !important',
    },

    prHeaderAvatar: {
        marginRight: token('space.100'),
    },

    prHeaderPrInfo: {
        textAlign: 'left',
    },

    prHeaderBranchesAndState: {
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: token('space.050'),
        '& > *': {
            lineHeight: 'normal',
        },
    },

    prHeaderTitle: {
        flex: '1 0 auto',
        font: token('font.heading.large'),
    },
}));

export function PullRequestHeader({
    state,
    controller,
    currentUserApprovalStatus,
    isSomethingLoading,
}: PullRequestHeaderProps) {
    const prState = state.pr.data.state;
    const isDraftPr = state.pr.data.draft;
    const notMerged = state.pr.data.state === 'OPEN';
    const isCurrentUserAuthor = state.currentUser.accountId === state.pr.data.author.accountId;

    const classes = useStyles();

    return (
        <PageHeader
            disableTitleStyles={true}
            breadcrumbs={
                <Breadcrumbs>
                    <BreadcrumbsItem text={state.pr.site.ownerSlug} key="owner-slug" className={classes.breadcrumb} />
                    <BreadcrumbsItem text={state.pr.site.repoSlug} key="repo-slug" className={classes.breadcrumb} />
                </Breadcrumbs>
            }
            bottomBar={
                <div className={classes.prHeaderBottomBar}>
                    <div className={classes.prHeaderPrAuthor}>
                        <div className={classes.prHeaderAvatar}>
                            <UserAvatar user={state.pr.data.author} />
                        </div>
                        <div className={classes.prHeaderPrInfo}>
                            <div className={classes.prHeaderBranchesAndState}>
                                <BranchTag branchName={state.pr.data.source.branchName} />
                                <ArrowRightIcon label={'branch-separator'} size="small" />
                                <BranchTag branchName={state.pr.data.destination.branchName} />
                                <StateLozenge pullRequestState={prState} isDraftPr={isDraftPr} />
                            </div>
                            <span>
                                {[
                                    formatTime(state.pr.data.ts, { prefix: 'Started' }),
                                    formatTime(state.pr.data.updatedTs, { prefix: 'Updated' }),
                                ]
                                    .filter((str) => !!str)
                                    .join(' • ')}
                            </span>
                        </div>
                    </div>

                    <PullRequestHeaderActions
                        state={state}
                        controller={controller}
                        currentUserApprovalStatus={currentUserApprovalStatus}
                        isDraftPr={isDraftPr}
                        isCurrentUserAuthor={isCurrentUserAuthor}
                        notMerged={notMerged}
                    />
                </div>
            }
        >
            <Flex alignItems="baseline" gap="space.050">
                <Heading as="div" size="large">
                    <Link href={state.pr.data.url}>{`#${state.pr.data.id}`}</Link>
                    {':'}
                </Heading>
                <div className={classes.prHeaderTitle}>
                    <Heading as="div" size="large">
                        <EditableTitle
                            renderedTitle={{
                                raw: state.pr.data.title,
                                html: '',
                                markup: 'markdown',
                                type: 'rendered',
                            }}
                            isDisabled={isCurrentUserAuthor}
                            isLoading={false}
                            onUpdate={controller.updateTitle}
                        />
                    </Heading>
                </div>
                <ButtonGroup>
                    <SourceCheckoutButton state={state} controller={controller} />
                    <RefreshButton loading={isSomethingLoading()} onClick={controller.refresh} />
                </ButtonGroup>
            </Flex>
        </PageHeader>
    );
}
