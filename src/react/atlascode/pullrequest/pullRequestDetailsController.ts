import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { v4 } from 'uuid';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    BuildStatus,
    Comment,
    FileDiff,
    MergeStrategy,
    Reviewer,
    Task,
    User,
} from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../lib/ipc/fromUI/pullRequestDetails';
import {
    emptyPullRequestDetailsInitMessage,
    FetchUsersResponseMessage,
    PullRequestDetailsApprovalMessage,
    PullRequestDetailsBuildStatusesMessage,
    PullRequestDetailsCheckoutBranchMessage,
    PullRequestDetailsCommentsMessage,
    PullRequestDetailsCommitsMessage,
    PullRequestDetailsFileDiffsMessage,
    PullRequestDetailsInitMessage,
    PullRequestDetailsMergeStrategiesMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsRelatedBitbucketIssuesMessage,
    PullRequestDetailsRelatedJiraIssuesMessage,
    PullRequestDetailsResponse,
    PullRequestDetailsReviewersMessage,
    PullRequestDetailsSummaryMessage,
    PullRequestDetailsTasksMessage,
    PullRequestDetailsTitleMessage,
    PullRequestDetailsConflictedFilesMessage,
} from '../../../lib/ipc/toUI/pullRequestDetails';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface PullRequestDetailsControllerApi {
    postMessage: PostMessageFunc<PullRequestDetailsAction>;
    refresh: () => void;
    copyLink: (url: string) => void;
    fetchUsers: (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => Promise<User[]>;
    updateSummary: (text: string) => void;
    updateTitle: (text: string) => void;
    updateReviewers: (newReviewers: User[]) => Promise<void>;
    updateApprovalStatus: (status: ApprovalStatus) => void;
    checkoutBranch: () => void;
    postComment: (rawText: string, parentId?: string) => Promise<void>;
    editComment: (rawContent: string, commentId: string) => Promise<void>;
    deleteComment: (comment: Comment) => Promise<void>;
    addTask: (content: string, parentId?: string) => Promise<void>;
    editTask: (task: Task) => Promise<void>;
    deleteTask: (task: Task) => Promise<void>;

    openDiff: (fileDiff: FileDiff) => void;
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[],
    ) => void;
    openJiraIssue: (issue: MinimalIssue<DetailedSiteInfo>) => void;
    openBitbucketIssue: (issue: BitbucketIssue) => void;
    openBuildStatus: (buildStatus: BuildStatus) => void;
}

const emptyApi: PullRequestDetailsControllerApi = {
    postMessage: (s) => {
        return;
    },
    refresh: (): void => {
        return;
    },
    copyLink: () => {},
    fetchUsers: async (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => [],
    updateSummary: async (text: string) => {
        return;
    },
    updateTitle: async (text: string) => {},
    updateReviewers: async (newReviewers: User[]) => {},
    updateApprovalStatus: (status: ApprovalStatus) => {},
    checkoutBranch: () => {},
    postComment: async (rawText: string, parentId?: string) => {},
    editComment: async (rawContent: string, commentId: string) => {},
    deleteComment: async (comment: Comment) => {},
    addTask: async (content: string, parentId?: string) => {},
    editTask: async (task: Task) => {},
    deleteTask: async (task: Task) => {},
    openDiff: (fileDiff: FileDiff) => {},
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[],
    ) => {},

    openJiraIssue: (issue: MinimalIssue<DetailedSiteInfo>) => {},
    openBitbucketIssue: (issue: BitbucketIssue) => {},
    openBuildStatus: (buildStatus: BuildStatus) => {},
};

export const PullRequestDetailsControllerContext = React.createContext(emptyApi);

export interface PullRequestDetailsState extends PullRequestDetailsInitMessage {
    isCheckingOutBranch: boolean;
}

const emptyState: PullRequestDetailsState = {
    ...emptyPullRequestDetailsInitMessage,
    isCheckingOutBranch: false,
};

enum PullRequestDetailsUIActionType {
    Init = 'init',
    ConfigChange = 'configChange',
    Loading = 'loading',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    UpdateComments = 'updateComments',
    UpdateTasks = 'updateTasks',
    AddComment = 'addComment',
    UpdateFileDiffs = 'updateFileDiffs',
    UpdateConflictedFiles = 'updateConflictedFiles',
    UpdateBuildStatuses = 'updateBuildStatuses',
    UpdateMergeStrategies = 'updateMergeStrategies',
    UpdateRelatedJiraIssues = 'updateRelatedJiraIssues',
    UpdateRelatedBitbucketIssues = 'updateRelatedBitbucketIssues',
    SetCheckoutLoading = 'setCheckoutLoading',
}

type PullRequestDetailsUIAction =
    | ReducerAction<PullRequestDetailsUIActionType.Init, { data: PullRequestDetailsInitMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateSummary, { data: PullRequestDetailsSummaryMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateTitle, { data: PullRequestDetailsTitleMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateCommits, { data: PullRequestDetailsCommitsMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateReviewers, { data: PullRequestDetailsReviewersMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateApprovalStatus, { data: PullRequestDetailsApprovalMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.CheckoutBranch, { data: PullRequestDetailsCheckoutBranchMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateComments, { data: PullRequestDetailsCommentsMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateTasks, { data: PullRequestDetailsTasksMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateFileDiffs, { data: PullRequestDetailsFileDiffsMessage }>
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateConflictedFiles,
          { data: PullRequestDetailsConflictedFilesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateBuildStatuses,
          { data: PullRequestDetailsBuildStatusesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateMergeStrategies,
          { data: PullRequestDetailsMergeStrategiesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateRelatedJiraIssues,
          { data: PullRequestDetailsRelatedJiraIssuesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues,
          { data: PullRequestDetailsRelatedBitbucketIssuesMessage }
      >
    | ReducerAction<PullRequestDetailsUIActionType.Loading>
    | ReducerAction<PullRequestDetailsUIActionType.SetCheckoutLoading, { data: { isLoading: boolean } }>;

function pullRequestDetailsReducer(
    state: PullRequestDetailsState,
    action: PullRequestDetailsUIAction,
): PullRequestDetailsState {
    switch (action.type) {
        case PullRequestDetailsUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                loadState: { ...action.data.loadState, basicData: false },
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case PullRequestDetailsUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        case PullRequestDetailsUIActionType.UpdateSummary: {
            return {
                ...state,
                pr: {
                    ...state.pr,
                    data: {
                        ...state.pr.data,
                        htmlSummary: action.data.htmlSummary,
                        rawSummary: action.data.rawSummary,
                    },
                },
            };
        }
        case PullRequestDetailsUIActionType.UpdateTitle: {
            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, title: action.data.title } },
            };
        }
        case PullRequestDetailsUIActionType.UpdateReviewers: {
            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, participants: action.data.reviewers } },
            };
        }
        case PullRequestDetailsUIActionType.UpdateApprovalStatus: {
            const currentUserId = state.currentUser.accountId;
            //Update the status of the current user and leave the rest unchanged
            const updatedParticipants: Reviewer[] =
                state.pr.data.participants.find((item) => item.accountId === currentUserId) === undefined
                    ? [
                          ...state.pr.data.participants,
                          {
                              ...state.currentUser,
                              status: action.data.status,
                              role: 'PARTICIPANT',
                          },
                      ]
                    : state.pr.data.participants.map((participant: Reviewer) => {
                          return participant.accountId === state.currentUser.accountId
                              ? {
                                    ...participant,
                                    status: action.data.status,
                                }
                              : participant;
                      });

            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, participants: updatedParticipants } },
            };
        }
        case PullRequestDetailsUIActionType.CheckoutBranch: {
            return {
                ...state,
                currentBranchName: action.data.branchName,
            };
        }
        case PullRequestDetailsUIActionType.UpdateCommits: {
            return { ...state, commits: action.data.commits, loadState: { ...state.loadState, commits: false } };
        }
        case PullRequestDetailsUIActionType.UpdateComments: {
            return { ...state, comments: action.data.comments, loadState: { ...state.loadState, comments: false } };
        }
        case PullRequestDetailsUIActionType.UpdateTasks: {
            return {
                ...state,
                comments: action.data.comments,
                tasks: action.data.tasks,
                loadState: { ...state.loadState, tasks: false },
            };
        }
        case PullRequestDetailsUIActionType.UpdateFileDiffs: {
            return { ...state, fileDiffs: action.data.fileDiffs, loadState: { ...state.loadState, diffs: false } };
        }
        case PullRequestDetailsUIActionType.UpdateConflictedFiles: {
            return {
                ...state,
                conflictedFiles: action.data.conflictedFiles,
                loadState: { ...state.loadState, diffs: false },
            };
        }
        case PullRequestDetailsUIActionType.UpdateBuildStatuses: {
            return {
                ...state,
                buildStatuses: action.data.buildStatuses,
                loadState: { ...state.loadState, buildStatuses: false },
            };
        }
        case PullRequestDetailsUIActionType.UpdateMergeStrategies: {
            return {
                ...state,
                mergeStrategies: action.data.mergeStrategies,
                loadState: { ...state.loadState, mergeStrategies: false },
            };
        }
        case PullRequestDetailsUIActionType.UpdateRelatedJiraIssues: {
            return {
                ...state,
                relatedJiraIssues: action.data.relatedIssues,
                loadState: { ...state.loadState, relatedJiraIssues: false },
            };
        }
        case PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues: {
            return {
                ...state,
                relatedBitbucketIssues: action.data.relatedIssues,
                loadState: { ...state.loadState, relatedBitbucketIssues: false },
            };
        }
        case PullRequestDetailsUIActionType.SetCheckoutLoading: {
            return {
                ...state,
                isCheckingOutBranch: action.data.isLoading,
            };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function usePullRequestDetailsController(): [PullRequestDetailsState, PullRequestDetailsControllerApi] {
    const [state, dispatch] = useReducer(pullRequestDetailsReducer, emptyState);

    const onMessageHandler = useCallback((message: PullRequestDetailsMessage): void => {
        switch (message.type) {
            case PullRequestDetailsMessageType.Init: {
                dispatch({ type: PullRequestDetailsUIActionType.Init, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateSummary: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateSummary, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateTitle: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateTitle, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateCommits: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateCommits, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateReviewers: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateReviewers, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateApprovalStatus: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateApprovalStatus, data: message });
                break;
            }
            case PullRequestDetailsMessageType.CheckoutBranch: {
                dispatch({ type: PullRequestDetailsUIActionType.CheckoutBranch, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateComments: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateComments, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateTasks: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateTasks, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateFileDiffs: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateFileDiffs, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateConflictedFiles: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateConflictedFiles, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateBuildStatuses: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateBuildStatuses, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateMergeStrategies: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateMergeStrategies, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateRelatedJiraIssues: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateRelatedJiraIssues, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues, data: message });
                break;
            }
            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<
        PullRequestDetailsAction,
        PullRequestDetailsMessage,
        PullRequestDetailsResponse
    >(onMessageHandler);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: PullRequestDetailsUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const copyLink = useCallback(
        (url: string) => postMessage({ type: CommonActionType.CopyLink, linkType: 'pullRequest', url }),
        [postMessage],
    );

    const fetchUsers = useCallback(
        (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return new Promise<User[]>((resolve, reject) => {
                (async () => {
                    try {
                        let abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();

                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'pull request fetchUsers cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.FetchUsersRequest,
                                site: site,
                                query: query,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            PullRequestDetailsMessageType.FetchUsersResponse,
                            ConnectionTimeout,
                        );
                        resolve((response as FetchUsersResponseMessage).users);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise],
    );

    const updateSummary = useCallback(
        (text: string) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateSummaryRequest, text: text });
        },
        [postMessage],
    );

    const updateTitle = useCallback(
        (text: string) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateTitleRequest, text: text });
        },
        [postMessage],
    );

    const updateReviewers = useCallback(
        (newReviewers: User[]): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.UpdateReviewers,
                                reviewers: newReviewers,
                            },
                            PullRequestDetailsMessageType.UpdateReviewersResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const updateApprovalStatus = useCallback(
        (status: ApprovalStatus) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateApprovalStatus, status: status });
        },
        [postMessage],
    );

    const checkoutBranch = useCallback(() => {
        dispatch({ type: PullRequestDetailsUIActionType.Loading });
        dispatch({ type: PullRequestDetailsUIActionType.SetCheckoutLoading, data: { isLoading: true } });

        postMessagePromise(
            { type: PullRequestDetailsActionType.CheckoutBranch },
            PullRequestDetailsMessageType.CheckoutBranch,
            ConnectionTimeout,
        ).finally(() => {
            dispatch({ type: PullRequestDetailsUIActionType.SetCheckoutLoading, data: { isLoading: false } });
        });
    }, [postMessagePromise]);

    const postComment = useCallback(
        (rawText: string, parentId?: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.PostComment,
                                rawText: rawText,
                                parentId: parentId,
                            },
                            PullRequestDetailsMessageType.PostCommentResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const editComment = useCallback(
        (rawContent: string, commentId: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.EditComment,
                                rawContent: rawContent,
                                commentId: commentId,
                            },
                            PullRequestDetailsMessageType.EditCommentResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const deleteComment = useCallback(
        (comment: Comment): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.DeleteComment,
                                comment: comment,
                            },
                            PullRequestDetailsMessageType.DeleteCommentResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const addTask = useCallback(
        (content: string, commentId?: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.AddTask,
                                content: content,
                                commentId: commentId,
                            },
                            PullRequestDetailsMessageType.AddTaskResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const editTask = useCallback(
        (task: Task): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.EditTask,
                                task: task,
                            },
                            PullRequestDetailsMessageType.EditTaskResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const deleteTask = useCallback(
        (task: Task): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.DeleteTask,
                                task: task,
                            },
                            PullRequestDetailsMessageType.DeleteTaskResponse,
                            ConnectionTimeout,
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise],
    );

    const openDiff = useCallback(
        (fileDiff: FileDiff) => postMessage({ type: PullRequestDetailsActionType.OpenDiffRequest, fileDiff: fileDiff }),
        [postMessage],
    );

    const merge = useCallback(
        (
            mergeStrategy: MergeStrategy,
            commitMessage: string,
            closeSourceBranch: boolean,
            issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[],
        ) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({
                type: PullRequestDetailsActionType.Merge,
                mergeStrategy: mergeStrategy,
                commitMessage: commitMessage,
                closeSourceBranch: closeSourceBranch,
                issues: issues,
            });
        },
        [postMessage],
    );

    const openJiraIssue = useCallback(
        (issue: MinimalIssue<DetailedSiteInfo>) => {
            postMessage({
                type: PullRequestDetailsActionType.OpenJiraIssue,
                issue: issue,
            });
        },
        [postMessage],
    );

    const openBitbucketIssue = useCallback(
        (issue: BitbucketIssue) => {
            postMessage({
                type: PullRequestDetailsActionType.OpenBitbucketIssue,
                issue: issue,
            });
        },
        [postMessage],
    );

    const openBuildStatus = useCallback(
        (buildStatus: BuildStatus) => {
            postMessage({
                type: PullRequestDetailsActionType.OpenBuildStatus,
                buildStatus: buildStatus,
            });
        },
        [postMessage],
    );

    const controllerApi = useMemo<PullRequestDetailsControllerApi>((): PullRequestDetailsControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            copyLink: copyLink,
            fetchUsers: fetchUsers,
            updateSummary: updateSummary,
            updateTitle: updateTitle,
            updateReviewers: updateReviewers,
            updateApprovalStatus: updateApprovalStatus,
            checkoutBranch: checkoutBranch,
            postComment: postComment,
            editComment: editComment,
            deleteComment: deleteComment,
            addTask: addTask,
            editTask: editTask,
            deleteTask: deleteTask,
            openDiff: openDiff,
            merge: merge,
            openJiraIssue: openJiraIssue,
            openBitbucketIssue: openBitbucketIssue,
            openBuildStatus: openBuildStatus,
        };
    }, [
        postMessage,
        sendRefresh,
        copyLink,
        fetchUsers,
        updateSummary,
        updateTitle,
        updateReviewers,
        updateApprovalStatus,
        checkoutBranch,
        postComment,
        editComment,
        deleteComment,
        addTask,
        editTask,
        deleteTask,
        openDiff,
        merge,
        openJiraIssue,
        openBitbucketIssue,
        openBuildStatus,
    ]);

    return [state, controllerApi];
}
