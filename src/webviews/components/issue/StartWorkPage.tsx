import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button';
import LoadingButton from '@atlaskit/button/loading-button';
import { Checkbox } from '@atlaskit/checkbox';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import SectionMessage from '@atlaskit/section-message';
import Select, { CreatableSelect } from '@atlaskit/select';
import {
    createEmptyMinimalIssue,
    emptyTransition,
    isMinimalIssue,
    MinimalIssue,
    Transition,
} from '@atlassianlabs/jira-pi-common-models';
import * as path from 'path';
import * as React from 'react';
import EdiText from 'react-editext';
import { AnalyticsView } from 'src/analyticsTypes';
import { AtlascodeErrorBoundary } from 'src/react/atlascode/common/ErrorBoundary';

import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { BitbucketIssue, emptyBitbucketSite, SiteRemote } from '../../../bitbucket/model';
import { CopyBitbucketIssueLink, OpenBitbucketIssueAction } from '../../../ipc/bitbucketIssueActions';
import { isStartWorkOnBitbucketIssueData, StartWorkOnBitbucketIssueData } from '../../../ipc/bitbucketIssueMessaging';
import {
    CopyJiraIssueLinkAction,
    OpenJiraIssueAction,
    RefreshIssueAction,
    StartWorkAction,
} from '../../../ipc/issueActions';
import {
    isStartWorkOnIssueData,
    isStartWorkOnIssueResult,
    StartWorkOnIssueData,
    StartWorkOnIssueResult,
} from '../../../ipc/issueMessaging';
import { HostErrorMessage } from '../../../ipc/messaging';
import { BranchType, RepoData } from '../../../ipc/prMessaging';
import { Branch } from '../../../typings/git';
import { AtlLoader } from '../AtlLoader';
import ErrorBanner from '../ErrorBanner';
import * as FieldValidators from '../fieldValidators';
import Offline from '../Offline';
import { WebviewComponent } from '../WebviewComponent';
import NavItem from './NavItem';
import { TransitionMenu } from './TransitionMenu';

type Emit =
    | RefreshIssueAction
    | StartWorkAction
    | OpenJiraIssueAction
    | CopyJiraIssueLinkAction
    | OpenBitbucketIssueAction
    | CopyBitbucketIssueLink;
type Accept = StartWorkOnIssueData | StartWorkOnBitbucketIssueData | HostErrorMessage;

const emptyRepoData: RepoData = {
    workspaceRepo: {
        rootUri: '',
        mainSiteRemote: { site: emptyBitbucketSite, remote: { name: '', isReadOnly: true } },
        siteRemotes: [],
    },
    localBranches: [],
    remoteBranches: [],
    branchTypes: [],
    isCloud: true,
};

type State = {
    data: StartWorkOnIssueData | StartWorkOnBitbucketIssueData;
    issueType: 'jiraIssue' | 'bitbucketIssue';
    jiraSetupEnabled: boolean;
    bitbucketSetupEnabled: boolean;
    transition: Transition;
    sourceBranch?: Branch;
    branchType?: BranchType;
    localBranch?: string;
    existingBranchOptions: string[];
    repo: RepoData;
    siteRemote?: SiteRemote;
    isStartButtonLoading: boolean;
    result: StartWorkOnIssueResult;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
};

const emptyState: State = {
    data: { type: 'update', issue: createEmptyMinimalIssue(emptySiteInfo), repoData: [] },
    issueType: 'jiraIssue',
    jiraSetupEnabled: true,
    bitbucketSetupEnabled: true,
    transition: emptyTransition,
    repo: emptyRepoData,
    localBranch: undefined,
    existingBranchOptions: [],
    isStartButtonLoading: false,
    result: { type: 'startWorkOnIssueResult', successMessage: undefined, error: undefined },
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
};

export default class StartWorkPage extends WebviewComponent<Emit, Accept, {}, State> {
    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    isEmptyRepo = (r: RepoData): boolean => r === emptyRepoData;

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isStartButtonLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'update': {
                if (isStartWorkOnIssueData(e) && e.issue.key.length > 0) {
                    const repo =
                        this.isEmptyRepo(this.state.repo) && e.repoData.length > 0 ? e.repoData[0] : this.state.repo;
                    const transition =
                        this.state.transition === emptyTransition
                            ? e.issue.transitions.find((t) => t.to.id === e.issue.status.id) || this.state.transition
                            : this.state.transition;
                    const issueType = 'jiraIssue';
                    const issueId = e.issue.key;
                    const issueTitle = e.issue.summary;
                    this.updateState(e, issueType, repo, issueId, issueTitle, transition);
                } else {
                    // empty issue
                    this.setState(emptyState);
                }
                break;
            }

            case 'startWorkOnBitbucketIssueData': {
                if (isStartWorkOnBitbucketIssueData(e)) {
                    let repo = this.state.repo;
                    if (this.isEmptyRepo(this.state.repo) && e.repoData.length > 0) {
                        const issueRepo =
                            e.repoData.find((r) => r.href === e.issue.data.repository!.links!.html!.href) ||
                            e.repoData[0];
                        repo = issueRepo;
                    }

                    const issueType = 'bitbucketIssue';
                    const issueId = `issue-#${e.issue.data.id!.toString()}`;
                    const issueTitle = e.issue.data.title!;
                    this.updateState(e, issueType, repo, issueId, issueTitle, emptyTransition);
                } else {
                    // empty issue
                    this.setState(emptyState);
                }
                break;
            }

            case 'startWorkOnIssueResult': {
                if (isStartWorkOnIssueResult(e)) {
                    this.setState({
                        isStartButtonLoading: false,
                        result: e,
                        isErrorBannerOpen: false,
                        errorDetails: undefined,
                    });
                }
                break;
            }

            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline) {
                    this.postMessage({ action: 'refreshIssue' });
                }
                break;
            }
        }

        return true;
    }

    handleStatusChange = (item: Transition) => {
        if (isStartWorkOnIssueData(this.state.data)) {
            this.setState({
                // there must be a better way to update the transition dropdown!!
                data: {
                    ...this.state.data,
                    issue: {
                        ...this.state.data.issue,
                        status: { ...this.state.data.issue.status, id: item.to.id, name: item.to.name },
                    },
                },
                transition: item,
            });
        }
    };

    handleRepoChange = (repo: RepoData) => {
        const issueId = isStartWorkOnIssueData(this.state.data)
            ? this.state.data.issue.key
            : `issue-#${this.state.data.issue.data.id}`;
        const sourceBranchValue = repo.localBranches.find(
            (b) => b.name !== undefined && b.name.indexOf(repo.developmentBranch!) !== -1,
        );
        this.setState({
            repo: repo,
            sourceBranch: sourceBranchValue,
            branchType: repo.branchTypes.length > 0 ? repo.branchTypes[0] : undefined,
            existingBranchOptions: this.getExistingBranchOptions(repo, issueId),
        });
    };

    handleSourceBranchChange = (newValue: Branch) => {
        this.setState({ sourceBranch: newValue });
    };

    handleBranchNameChange = (e: string) => {
        this.setState({ localBranch: e });
    };

    handleSelectExistingBranch = (branchName: string) => {
        const branchType = this.state.repo.branchTypes.find((b) => branchName.startsWith(b.prefix));
        this.setState({
            branchType: branchType,
            localBranch: branchType ? branchName.substring(branchType.prefix.length) : branchName,
        });
    };

    toggleJiraSetupEnabled = (e: any) => {
        this.setState({
            jiraSetupEnabled: e.target.checked,
        });
    };

    toggleBitbucketSetupEnabled = (e: any) => {
        this.setState({
            bitbucketSetupEnabled: e.target.checked,
        });
    };

    handleSiteRemoteChange = (newValue: SiteRemote) => {
        this.setState({ siteRemote: newValue });
    };

    handleStart = () => {
        this.setState({ isStartButtonLoading: true });

        let branchName = '';
        if (this.state.localBranch) {
            const prefix = this.state.branchType ? this.state.branchType.prefix : '';
            branchName = prefix + this.state.localBranch;
        }

        this.postMessage({
            action: 'startWork',
            repoUri: this.state.repo.workspaceRepo.rootUri,
            targetBranchName: branchName,
            sourceBranch: this.state.sourceBranch!,
            remoteName: this.state.siteRemote ? this.state.siteRemote.remote.name : '',
            transition: this.state.transition,
            setupJira: this.state.jiraSetupEnabled,
            setupBitbucket: this.isEmptyRepo(this.state.repo) ? false : this.state.bitbucketSetupEnabled,
            pushBranchToRemote: false,
        });
    };

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    private getExistingBranchOptions(repo: RepoData, issueId: string): string[] {
        const matchingLocalBranches = repo.localBranches
            .filter((b) => b.name!.toLowerCase().includes(issueId.toLowerCase()))
            .map((b) => b.name!);
        const matchingRemoteBranches = repo.remoteBranches
            .filter((b) => b.name!.toLowerCase().includes(issueId.toLowerCase()))
            .filter(
                (remoteBranch) =>
                    !repo.localBranches.some((localBranch) => remoteBranch.name!.endsWith(localBranch.name!)),
            )
            .map((b) => b.name!.replace(`${b.remote!}/`, ''));

        return [...matchingLocalBranches, ...matchingRemoteBranches];
    }

    private updateState(
        data: StartWorkOnIssueData | StartWorkOnBitbucketIssueData,
        issueType: 'jiraIssue' | 'bitbucketIssue',
        repo: RepoData,
        issueId: string,
        issueTitle: string,
        transition: Transition,
    ) {
        const branchOptions =
            this.state.existingBranchOptions.length > 0
                ? this.state.existingBranchOptions
                : this.getExistingBranchOptions(repo, issueId);

        const localBranch =
            this.state.localBranch ||
            `${issueId}-${issueTitle.substring(0, 50).trim().toLowerCase().replace(/\W+/g, '-')}`;
        const sourceBranch =
            this.state.sourceBranch ||
            repo.localBranches.find((b) => b.name !== undefined && b.name.indexOf(repo.developmentBranch!) !== -1) ||
            repo.localBranches[0];

        let siteRemote = this.state.siteRemote;
        if (!this.state.siteRemote) {
            siteRemote = repo.workspaceRepo.mainSiteRemote;
        }

        this.setState({
            data: data,
            issueType: issueType,
            repo: repo,
            sourceBranch: sourceBranch,
            transition: transition,
            existingBranchOptions: branchOptions,
            localBranch: localBranch,
            branchType: repo.branchTypes.length > 0 ? repo.branchTypes[0] : undefined,
            siteRemote: siteRemote,
            bitbucketSetupEnabled: this.isEmptyRepo(repo) ? false : this.state.bitbucketSetupEnabled,
            isErrorBannerOpen: false,
            errorDetails: undefined,
        });
    }

    render() {
        if (
            isStartWorkOnIssueData(this.state.data) &&
            this.state.data.issue.key === '' &&
            !this.state.isErrorBannerOpen &&
            this.state.isOnline
        ) {
            this.postMessage({ action: 'refreshIssue' });
            return <AtlLoader />;
        }

        const issue = this.state.data.issue;
        const repo = this.state.repo;
        const snippetTip = (
            <div className="ac-vpadding">
                <p>
                    <strong>Tip:</strong> You can have issue keys auto-added to your commit messages using{' '}
                    <a
                        type="button"
                        className="ac-link-button"
                        href="https://github.com/atlassian/atlascode/blob/main/scripts/prepare-commit-jira.sh"
                    >
                        <span>our prepare-commit-msg hook</span>
                    </a>
                </p>
            </div>
        );

        let pageHeader = (
            <GridColumn medium={8}>
                <em>
                    <p>Start work on:</p>
                </em>
            </GridColumn>
        );

        if (this.state.issueType === 'jiraIssue' && isMinimalIssue(issue)) {
            pageHeader = (
                <GridColumn medium={8}>
                    <em>
                        <p>Start work on:</p>
                    </em>
                    <PageHeader
                        actions={undefined}
                        breadcrumbs={
                            <Breadcrumbs>
                                {issue.parentKey && (
                                    <BreadcrumbsItem
                                        component={() => (
                                            <NavItem
                                                text={`${issue.parentKey}`}
                                                onItemClick={() =>
                                                    this.postMessage({
                                                        action: 'openJiraIssue',
                                                        issueOrKey: {
                                                            siteDetails: issue.siteDetails,
                                                            key: issue.parentKey!,
                                                        },
                                                    })
                                                }
                                            />
                                        )}
                                    />
                                )}
                                <BreadcrumbsItem
                                    component={() => (
                                        <NavItem
                                            text={`${issue.key}`}
                                            iconUrl={issue.issuetype.iconUrl}
                                            onItemClick={() =>
                                                this.postMessage({ action: 'openJiraIssue', issueOrKey: issue })
                                            }
                                            onCopy={() => this.postMessage({ action: 'copyJiraIssueLink' })}
                                        />
                                    )}
                                />
                            </Breadcrumbs>
                        }
                    >
                        <p>{issue.summary}</p>
                    </PageHeader>
                    <p dangerouslySetInnerHTML={{ __html: issue.descriptionHtml }} />
                </GridColumn>
            );
        } else if (this.state.issueType === 'bitbucketIssue') {
            const bbIssue = issue as BitbucketIssue;
            pageHeader = (
                <GridColumn medium={8}>
                    <em>
                        <p>Start work on:</p>
                    </em>
                    <PageHeader
                        actions={undefined}
                        breadcrumbs={
                            <Breadcrumbs>
                                <BreadcrumbsItem
                                    component={() => (
                                        <NavItem
                                            text={bbIssue.data.repository!.name!}
                                            href={bbIssue.data.repository!.links!.html!.href}
                                        />
                                    )}
                                />
                                <BreadcrumbsItem
                                    component={() => (
                                        <NavItem
                                            text="Issues"
                                            href={`${bbIssue.data.repository!.links!.html!.href}/issues`}
                                        />
                                    )}
                                />
                                <BreadcrumbsItem
                                    component={() => (
                                        <NavItem
                                            text={`Issue #${bbIssue.data.id}`}
                                            onItemClick={() =>
                                                this.postMessage({ action: 'openBitbucketIssue', issue: bbIssue })
                                            }
                                            onCopy={() => this.postMessage({ action: 'copyBitbucketIssueLink' })}
                                        />
                                    )}
                                />
                            </Breadcrumbs>
                        }
                    >
                        <p>{bbIssue.data.title}</p>
                    </PageHeader>
                    <p dangerouslySetInnerHTML={{ __html: bbIssue.data.content!.html! }} />
                </GridColumn>
            );
        }

        return (
            <Page>
                <AtlascodeErrorBoundary
                    context={{ view: AnalyticsView.OldStartWorkPage }}
                    postMessageFunc={(e) => {
                        this.postMessage(e); /* just {this.postMessage} doesn't work */
                    }}
                >
                    <Grid>
                        <GridColumn medium={8}>
                            {!this.state.isOnline && <Offline />}

                            {this.state.result.successMessage && (
                                <SectionMessage appearance="confirmation" title="Work Started">
                                    <div className="start-work-success">
                                        <p dangerouslySetInnerHTML={{ __html: this.state.result.successMessage }} />
                                    </div>
                                </SectionMessage>
                            )}
                            {this.state.isErrorBannerOpen && (
                                <ErrorBanner
                                    onDismissError={this.handleDismissError}
                                    errorDetails={this.state.errorDetails}
                                />
                            )}
                        </GridColumn>
                        {pageHeader}
                        {this.state.issueType === 'jiraIssue' && (
                            <GridColumn medium={6}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Checkbox
                                        isChecked={this.state.jiraSetupEnabled}
                                        onChange={this.toggleJiraSetupEnabled}
                                        name="setup-jira-checkbox"
                                    />
                                    <h4>Transition issue</h4>
                                </div>
                                {this.state.jiraSetupEnabled && (
                                    <div
                                        style={{
                                            margin: 10,
                                            borderLeftWidth: 'initial',
                                            borderLeftStyle: 'solid',
                                            borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)',
                                        }}
                                    >
                                        <div style={{ margin: 10 }}>
                                            <label>Select new status</label>
                                            <TransitionMenu
                                                transitions={(issue as MinimalIssue<DetailedSiteInfo>).transitions}
                                                currentStatus={(issue as MinimalIssue<DetailedSiteInfo>).status}
                                                isStatusButtonLoading={false}
                                                onStatusChange={this.handleStatusChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </GridColumn>
                        )}
                        <GridColumn medium={12} />
                        <GridColumn medium={8}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Checkbox
                                    isChecked={this.state.bitbucketSetupEnabled}
                                    onChange={this.toggleBitbucketSetupEnabled}
                                    name="setup-bitbucket-checkbox"
                                />
                                <h4>Set up git branch</h4>
                            </div>
                            {this.isEmptyRepo(repo) && (
                                <div
                                    style={{
                                        margin: 10,
                                        borderLeftWidth: 'initial',
                                        borderLeftStyle: 'solid',
                                        borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)',
                                    }}
                                >
                                    <div style={{ margin: 10 }}>
                                        <div className="ac-vpadding">
                                            <label>Repository</label>
                                            <Select
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                placeholder="No repositories found..."
                                                value={repo}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {this.state.bitbucketSetupEnabled && !this.isEmptyRepo(this.state.repo) && (
                                <div
                                    style={{
                                        margin: 10,
                                        borderLeftWidth: 'initial',
                                        borderLeftStyle: 'solid',
                                        borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)',
                                    }}
                                >
                                    <div style={{ margin: 10 }}>
                                        {this.state.data.repoData.length > 1 && (
                                            <div className="ac-vpadding">
                                                <label>Repository</label>
                                                <Select
                                                    className="ac-select-container"
                                                    classNamePrefix="ac-select"
                                                    options={this.state.data.repoData}
                                                    getOptionLabel={(option: RepoData) =>
                                                        this.isEmptyRepo(option)
                                                            ? 'No repositories found...'
                                                            : path.basename(option.workspaceRepo.rootUri)
                                                    }
                                                    getOptionValue={(option: RepoData) => option}
                                                    onChange={this.handleRepoChange}
                                                    placeholder="Loading..."
                                                    value={repo}
                                                />
                                            </div>
                                        )}
                                        {repo.branchTypes.length > 0 && (
                                            <div className="ac-vpadding" style={{ textTransform: 'capitalize' }}>
                                                <label>Type</label>
                                                <CreatableSelect
                                                    className="ac-select-container"
                                                    classNamePrefix="ac-select"
                                                    options={repo.branchTypes}
                                                    getOptionLabel={(option: BranchType) => option.kind}
                                                    getOptionValue={(option: BranchType) => option.prefix}
                                                    onChange={(model: any) => {
                                                        this.setState({ branchType: model });
                                                    }}
                                                    value={this.state.branchType}
                                                />
                                            </div>
                                        )}
                                        <div className="ac-vpadding">
                                            <label>
                                                Source branch (this will be the start point for the new branch)
                                            </label>
                                            <Select
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                options={[...repo.localBranches, ...repo.remoteBranches]}
                                                getOptionLabel={(option: Branch) => option.name}
                                                getOptionValue={(option: Branch) => option}
                                                onChange={this.handleSourceBranchChange}
                                                value={this.state.sourceBranch}
                                            />
                                        </div>
                                        <div className="ac-vpadding">
                                            <label>Local branch</label>
                                            <div className="branch-container">
                                                {this.state.branchType && this.state.branchType.prefix && (
                                                    <div className="prefix-container">
                                                        <label>{this.state.branchType.prefix}</label>
                                                    </div>
                                                )}
                                                <div className="branch-name">
                                                    <EdiText
                                                        type="text"
                                                        value={this.state.localBranch || ''}
                                                        onSave={this.handleBranchNameChange}
                                                        validation={FieldValidators.isValidString}
                                                        validationMessage="Branch name is required"
                                                        inputProps={{ className: 'ac-inputField' }}
                                                        viewProps={{
                                                            id: 'start-work-branch-name',
                                                            className: 'ac-inline-input-view-p',
                                                        }}
                                                        editButtonClassName="ac-inline-edit-button"
                                                        cancelButtonClassName="ac-inline-cancel-button"
                                                        saveButtonClassName="ac-inline-save-button"
                                                        editOnViewClick={true}
                                                    />
                                                </div>
                                            </div>
                                            {this.state.existingBranchOptions.length > 0 && (
                                                <SectionMessage appearance="change" title="Use an existing branch?">
                                                    <div>
                                                        <p>
                                                            Click to use an existing branch for this issue: (
                                                            <em>
                                                                source branch selection is ignored for existing branches
                                                            </em>
                                                            )
                                                        </p>
                                                        <ul>
                                                            {this.state.existingBranchOptions.map((branchName) => (
                                                                <li>
                                                                    <Button
                                                                        className="ac-link-button"
                                                                        appearance="link"
                                                                        onClick={() =>
                                                                            this.handleSelectExistingBranch(branchName)
                                                                        }
                                                                    >
                                                                        {branchName}
                                                                    </Button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </SectionMessage>
                                            )}
                                        </div>
                                        {repo.workspaceRepo.siteRemotes.length > 1 && (
                                            <div>
                                                <label>Set upstream to</label>
                                                <Select
                                                    className="ac-select-container"
                                                    classNamePrefix="ac-select"
                                                    options={repo.workspaceRepo.siteRemotes}
                                                    getOptionLabel={(option: SiteRemote) => option.remote.name}
                                                    getOptionValue={(option: SiteRemote) => option}
                                                    onChange={this.handleSiteRemoteChange}
                                                    value={this.state.siteRemote}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </GridColumn>
                        <GridColumn medium={12}>
                            <div className="ac-vpadding">
                                {!this.state.result.successMessage && (
                                    <LoadingButton
                                        className="ac-button"
                                        isLoading={this.state.isStartButtonLoading}
                                        onClick={this.handleStart}
                                    >
                                        Start
                                    </LoadingButton>
                                )}
                            </div>
                            {snippetTip}
                        </GridColumn>
                    </Grid>
                </AtlascodeErrorBoundary>
            </Page>
        );
    }
}
