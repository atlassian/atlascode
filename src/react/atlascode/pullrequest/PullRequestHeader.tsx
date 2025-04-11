import Breadcrumbs from '@atlaskit/breadcrumbs';
import { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { ButtonGroup } from '@atlaskit/button';
import Heading from '@atlaskit/heading';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import Link from '@atlaskit/link';
import PageHeader from '@atlaskit/page-header';
import { Flex } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { Theme } from '@material-ui/core';
import { makeStyles } from '@material-ui/core';
import React, { useMemo } from 'react';

import { formatTime } from '../util/date-fns';
import { BranchTag } from './BranchTag';
import { EditableTitle } from './EditableTitle';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { PullRequestHeaderActions } from './PullRequestHeaderActions';
import { RefreshButton } from './RefreshButton';
import { SourceCheckoutButton } from './SourceCheckoutButton';
import StateLozenge from './StateLozenge';
import UserAvatar from './UserAvatar';

interface PullRequestHeaderProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
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
        flex: '1 1 auto',
        font: token('font.heading.large'),
    },
}));

export function PullRequestHeader({ state, controller }: PullRequestHeaderProps) {
    const prState = state.pr.data.state;
    const isDraftPr = state.pr.data.draft;
    const notMerged = state.pr.data.state === 'OPEN';
    const isCurrentUserAuthor = state.currentUser.accountId === state.pr.data.author.accountId;

    const classes = useStyles();

    const isSomethingLoading = useMemo(() => {
        return Object.entries(state.loadState).some(
            (entry) => entry[1] /* Second index is the value in the key/value pair */,
        );
    }, [state.loadState]);

    return (
        <PageHeader
            disableTitleStyles={true}
            breadcrumbs={
                <Breadcrumbs testId="vscode-breadcrumbs">
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
                    {state.currentBranchName !== null && <SourceCheckoutButton state={state} controller={controller} />}
                    <RefreshButton loading={isSomethingLoading} onClick={controller.refresh} />
                </ButtonGroup>
            </Flex>
        </PageHeader>
    );
}
