import { createEmptyEditIssueUI, EditIssueUI } from '@atlassianlabs/jira-metaui-client';
import { emptyUser, isMinimalIssue, MinimalIssue, Project, User } from '@atlassianlabs/jira-pi-common-models';
import {
    createEmptyIssueTypeUI,
    CreateMetaTransformerProblems,
    FieldValues,
    IssueTypeUI,
    SelectFieldOptions,
} from '@atlassianlabs/jira-pi-meta-models';

import { DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';
import { PullRequestData } from '../bitbucket/model';
import { HostErrorMessage, Message } from './messaging';
import { RepoData } from './prMessaging';

export interface BranchInfo {
    name: string;
    url?: string;
}

export interface CommitInfo {
    hash: string;
    message: string;
    url?: string;
    authorName?: string;
}

export interface BuildInfo {
    name?: string;
    key?: string;
    state: string;
}

export interface DevelopmentInfo {
    branches: BranchInfo[];
    commits: CommitInfo[];
    pullRequests: PullRequestData[];
    builds: BuildInfo[];
}

export const emptyDevelopmentInfo: DevelopmentInfo = {
    branches: [],
    commits: [],
    pullRequests: [],
    builds: [],
};

// IssueData is the message that gets sent to the JiraIssuePage react view containing the issue details.
// we simply use the same name with two extend statements to merge the multiple interfaces
export interface EditIssueData extends Message {}
export interface EditIssueData extends EditIssueUI<DetailedSiteInfo> {
    currentUser: User;
    workInProgress: boolean;
    recentPullRequests: PullRequestData[];
    developmentInfo?: DevelopmentInfo;
}

export const emptyEditIssueData: EditIssueData = {
    type: '',
    ...createEmptyEditIssueUI(emptySiteInfo),
    currentUser: emptyUser,
    workInProgress: false,
    recentPullRequests: [],
    developmentInfo: emptyDevelopmentInfo,
};

export interface IssueProblemsData extends Message {
    problems: CreateMetaTransformerProblems;
    project: Project;
}

export interface CreateIssueData extends Message {}
export interface CreateIssueData extends IssueTypeUI<DetailedSiteInfo> {
    currentUser: User;
    transformerProblems: CreateMetaTransformerProblems;
    projectPagination?: {
        total: number;
        loaded: number;
        hasMore: boolean;
        isLoadingMore: boolean;
    };
}

export const emptyCreateIssueData: CreateIssueData = {
    type: '',
    ...createEmptyIssueTypeUI(emptySiteInfo),
    currentUser: emptyUser,
    transformerProblems: {},
};

export interface IssueEditError extends HostErrorMessage {
    fieldValues: FieldValues;
}

export function isIssueEditError(m: Message): m is IssueEditError {
    return (<IssueEditError>m).fieldValues !== undefined;
}

export interface LabelList extends Message {
    labels: any[];
}

export interface UserList extends Message {
    users: any[];
}

export interface IssueSuggestionsList extends Message {
    issues: any[];
}

export interface CreatedSelectOption extends Message {
    fieldValues: FieldValues;
    selectFieldOptions: SelectFieldOptions;
    fieldKey: string;
}

export interface IssueCreated extends Message {
    issueData: any;
}

export interface StartWorkOnIssueData extends Message {
    issue: MinimalIssue<DetailedSiteInfo>;
    repoData: RepoData[];
}

export interface StartWorkOnIssueResult extends Message {
    type: 'startWorkOnIssueResult';
    successMessage?: string;
    error?: string;
}

export function isIssueCreated(m: Message): m is IssueCreated {
    return !!(<IssueCreated>m).issueData;
}

export function isStartWorkOnIssueData(m: Message): m is StartWorkOnIssueData {
    return (<StartWorkOnIssueData>m).issue !== undefined && isMinimalIssue((<StartWorkOnIssueData>m).issue);
}

export function isStartWorkOnIssueResult(m: Message): m is StartWorkOnIssueResult {
    return (<StartWorkOnIssueResult>m).type === 'startWorkOnIssueResult';
}

export interface IssueHistoryItem {
    id: string;
    timestamp: string;
    author: {
        displayName: string;
        accountId?: string;
        avatarUrl?: string;
    };
    field: string;
    fieldDisplayName: string;
    from?: string | null;
    to?: string | null;
    fromString?: string;
    toString?: string;
    worklogTimeSpent?: string;
    worklogComment?: string;
}

export interface IssueHistoryUpdate extends Message {
    type: 'historyUpdate';
    history: IssueHistoryItem[];
}
