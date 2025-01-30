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

// IssueData is the message that gets sent to the JiraIssuePage react view containing the issue details.
// we simply use the same name with two extend statements to merge the multiple interfaces
export interface EditIssueData extends Message {}
export interface EditIssueData extends EditIssueUI<DetailedSiteInfo> {
    currentUser: User;
    workInProgress: boolean;
    recentPullRequests: PullRequestData[];
}

export const emptyEditIssueData: EditIssueData = {
    type: '',
    ...createEmptyEditIssueUI(emptySiteInfo),
    currentUser: emptyUser,
    workInProgress: false,
    recentPullRequests: [],
};

export interface IssueProblemsData extends Message {
    problems: CreateMetaTransformerProblems;
    project: Project;
}

export interface CreateIssueData extends Message {}
export interface CreateIssueData extends IssueTypeUI<DetailedSiteInfo> {
    currentUser: User;
    transformerProblems: CreateMetaTransformerProblems;
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
export interface FieldValueUpdate extends Message {
    type: 'fieldValueUpdate';
    fieldValues: FieldValues;
}

export interface EpicChildrenUpdate extends Message {
    type: 'epicChildrenUpdate';
    epicChildren: MinimalIssue<DetailedSiteInfo>[];
}

export interface PullRequestUpdate extends Message {
    type: 'pullRequestUpdate';
    recentPullRequests: PullRequestData[];
}

export interface CurrentUserUpdate extends Message {
    type: 'currentUserUpdate';
    currentUser: User;
}

export interface ProjectList extends Message {
    availableProjects: Project[];
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

export interface JqlOptionsList extends Message {
    options: any[];
    fieldId: string;
}

export interface SelectOptionsList extends Message {
    options: any[];
    fieldId: string;
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

export function isCreatedSelectOption(m: Message): m is CreatedSelectOption {
    return (
        m &&
        (<CreatedSelectOption>m).fieldValues !== undefined &&
        (<CreatedSelectOption>m).selectFieldOptions !== undefined &&
        (<CreatedSelectOption>m).fieldKey !== undefined
    );
}

export function isIssueCreated(m: Message): m is IssueCreated {
    return (<IssueCreated>m).issueData !== undefined;
}

export function isStartWorkOnIssueData(m: Message): m is StartWorkOnIssueData {
    return (<StartWorkOnIssueData>m).issue !== undefined && isMinimalIssue((<StartWorkOnIssueData>m).issue);
}

export function isStartWorkOnIssueResult(m: Message): m is StartWorkOnIssueResult {
    return (<StartWorkOnIssueResult>m).type === 'startWorkOnIssueResult';
}
