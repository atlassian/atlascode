import * as React from 'react';

import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState,
} from './AbstractIssueEditorPage';
import { CreateIssueData, emptyCreateIssueData, isIssueCreated } from '../../../ipc/issueMessaging';
import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { FieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import Form, { Field, FormFooter } from '@atlaskit/form';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Select, { components } from '@atlaskit/select';

import { AtlLoader } from '../AtlLoader';
import Button from '@atlaskit/button';
import ErrorBanner from '../ErrorBanner';
import { IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { LegacyPMFData } from '../../../ipc/messaging';
import LoadingButton from '@atlaskit/button/loading-button';
import Offline from '../Offline';
import PMFBBanner from '../pmfBanner';
import Panel from '@atlaskit/panel';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { chain } from '../fieldValidators';
import { AtlascodeErrorBoundary } from 'src/react/atlascode/common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';

type Emit = CommonEditorPageEmit;
type Accept = CommonEditorPageAccept | CreateIssueData;
interface ViewState extends CommonEditorViewState, CreateIssueData {
    isCreateBannerOpen: boolean;
    createdIssue: IssueKeyAndSite<DetailedSiteInfo>;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyCreateIssueData,
    isCreateBannerOpen: false,
    createdIssue: { key: '', siteDetails: emptySiteInfo },
};

const IconOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}>
            <img src={props.data.avatarUrl} width="24" height="24" />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={props.data.avatarUrl} width="16" height="16" />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.SingleValue>
);

export default class CreateIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    private advancedFields: FieldUI[] = [];
    private commonFields: FieldUI[] = [];

    getProjectKey(): string {
        return this.state.fieldValues['project'].key;
    }

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    handled = true;
                    const issueData = e as CreateIssueData;
                    this.updateInternals(issueData);
                    this.setState(issueData, () => {
                        this.setState({ isSomethingLoading: false, loadingField: '' });
                    });

                    break;
                }
                case 'currentUserUpdate': {
                    handled = true;
                    this.setState({ currentUser: e.currentUser });
                    break;
                }
                case 'issueCreated': {
                    handled = true;
                    if (isIssueCreated(e)) {
                        this.setState({
                            isErrorBannerOpen: false,
                            errorDetails: undefined,
                            isSomethingLoading: false,
                            loadingField: '',
                            isCreateBannerOpen: true,
                            createdIssue: e.issueData,
                            fieldValues: {
                                ...this.state.fieldValues,
                                ...{ description: '', summary: '' },
                            },
                        });
                    }
                    break;
                }
            }
        }

        return handled;
    }

    updateInternals(data: CreateIssueData) {
        const orderedValues: FieldUI[] = this.sortFieldValues(data.fields);
        this.advancedFields = [];
        this.commonFields = [];

        orderedValues.forEach((field) => {
            if (field.advanced) {
                this.advancedFields.push(field);
            } else {
                this.commonFields.push(field);
            }
        });
    }

    handleSubmit = async (e: any) => {
        let requiredFields = Object.values(this.state.fields).filter((field) => field.required);

        let errs = {};
        requiredFields.forEach((field: FieldUI) => {
            if (field.uiType === UIType.Worklog && this.state.fieldValues[`${field.key}.enabled`]) {
                const timeSpent = this.state.fieldValues[`${field.key}.timeSpent`];
                const newEstimate = this.state.fieldValues[`${field.key}.newEstimate`];
                const started = this.state.fieldValues[`${field.key}.started`];
                const comment = this.state.fieldValues[`${field.key}.comment`];

                if (timeSpent === undefined || timeSpent.length < 1) {
                    errs[`${field.key}.timeSpent`] = 'EMPTY';
                }
                if (newEstimate === undefined || newEstimate.length < 1) {
                    errs[`${field.key}.newEstimate`] = 'EMPTY';
                }
                if (started === undefined || started.length < 1) {
                    errs[`${field.key}.started`] = 'EMPTY';
                }
                if (comment === undefined || comment.length < 1) {
                    errs[`${field.key}.comment`] = 'EMPTY';
                }
            }

            const val = this.state.fieldValues[field.key];
            if (val === undefined || val.length < 1) {
                errs[field.key] = 'EMPTY';
            }
        });

        if (Object.keys(errs).length > 0) {
            return errs;
        }

        this.setState({
            isSomethingLoading: true,
            loadingField: 'submitButton',
            isCreateBannerOpen: false,
        });
        this.postMessage({
            action: 'createIssue',
            site: this.state.siteDetails,
            issueData: this.state.fieldValues,
        });

        return undefined;
    };

    handleSiteChange = (site: DetailedSiteInfo) => {
        this.setState({ siteDetails: site, loadingField: 'site', isSomethingLoading: true });
        this.postMessage({
            action: 'getScreensForSite',
            site: site,
        });
    };

    protected handleInlineEdit = async (field: FieldUI, newValue: any) => {
        let typedVal = newValue;
        let fieldkey = field.key;

        if (typedVal === undefined) {
            this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: typedVal } } });
            return;
        }

        if (field.valueType === ValueType.Number && typeof newValue !== 'number') {
            typedVal = parseFloat(newValue);
        }

        if (field.key.indexOf('.') > -1) {
            let valObj = {};
            const splits = field.key.split('.');
            fieldkey = splits[0];
            if (this.state.fieldValues[splits[0]]) {
                valObj = this.state.fieldValues[splits[0]];
            }
            valObj[splits[1]] = typedVal;
            typedVal = valObj;
        }

        if (field.uiType === UIType.Attachment) {
            if (Array.isArray(newValue) && newValue.length > 0) {
                const serFiles = newValue.map((file: any) => {
                    return {
                        lastModified: file.lastModified,
                        lastModifiedDate: file.lastModifiedDate,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        path: file.path,
                    };
                });

                typedVal = serFiles;
            }
        }

        this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: typedVal } } });

        if (field.valueType === ValueType.Project) {
            this.setState({ loadingField: field.key, isSomethingLoading: true });
            this.postMessage({
                action: 'getScreensForProject',
                project: newValue,
                fieldValues: this.state.fieldValues,
            });
        }

        if (field.valueType === ValueType.IssueType) {
            this.setState({ loadingField: field.key, isSomethingLoading: true });
            this.postMessage({
                action: 'setIssueType',
                issueType: newValue,
                fieldValues: this.state.fieldValues,
            });
        }
    };

    fetchUsers = (input: string) => {
        return this.loadSelectOptions(
            input,
            `${this.state.siteDetails.baseApiUrl}/api/${this.state.apiVersion}/user/search?${
                this.state.siteDetails.isCloud ? 'query' : 'username'
            }=`,
        );
    };

    getCommonFieldMarkup(): any {
        return this.commonFields.map((field) => this.getInputMarkup(field));
    }

    getAdvancedFieldMarkup(): any {
        return this.advancedFields.map((field) => this.getInputMarkup(field));
    }

    public render() {
        if (
            !this.state.fieldValues['issuetype'] ||
            (this.state.fieldValues['issuetype'].id === '' && !this.state.isErrorBannerOpen && this.state.isOnline)
        ) {
            this.postMessage({ action: 'refresh' });
            return <AtlLoader />;
        }
        return (
            <Page>
                <AtlascodeErrorBoundary
                    postMessageFunc={(e) => {
                        this.postMessage(e); /* just {this.postMessage} doesn't work */
                    }}
                    context={{ view: AnalyticsView.CreateJiraIssuePage }}
                >
                    <Grid>
                        <GridColumn medium={8}>
                            <div>
                                {!this.state.isOnline && <Offline />}
                                {this.state.showPMF && (
                                    <PMFBBanner
                                        onPMFOpen={() => this.onPMFOpen()}
                                        onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })}
                                        onPMFLater={() => this.onPMFLater()}
                                        onPMFNever={() => this.onPMFNever()}
                                        onPMFSubmit={(data: LegacyPMFData) => this.onPMFSubmit(data)}
                                    />
                                )}
                                {this.state.isCreateBannerOpen && (
                                    <div className="fade-in">
                                        <SectionMessage appearance="confirmation" title="Issue Created">
                                            <p>
                                                Issue{' '}
                                                <Button
                                                    className="ac-banner-link-button"
                                                    appearance="link"
                                                    spacing="none"
                                                    onClick={() => {
                                                        this.handleOpenIssue(this.state.createdIssue);
                                                    }}
                                                >
                                                    {this.state.createdIssue.key}
                                                </Button>{' '}
                                                has been created.
                                            </p>
                                        </SectionMessage>
                                    </div>
                                )}
                                {this.state.isErrorBannerOpen && (
                                    <ErrorBanner
                                        onDismissError={this.handleDismissError}
                                        errorDetails={this.state.errorDetails}
                                    />
                                )}
                                <div className="ac-vpadding">
                                    <div className="ac-flex">
                                        <h2>Create Issue</h2>
                                        {this.state.isSomethingLoading && (
                                            <div className="spinner" style={{ marginLeft: '15px' }}>
                                                <Spinner size="medium" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Form name="create-issue" onSubmit={this.handleSubmit}>
                                    {(frmArgs: any) => {
                                        return (
                                            <form {...frmArgs.formProps}>
                                                <Field
                                                    label="Select Site"
                                                    id="site"
                                                    name="site"
                                                    defaultValue={this.state.siteDetails}
                                                >
                                                    {(fieldArgs: any) => {
                                                        return (
                                                            <Select
                                                                {...fieldArgs.fieldProps}
                                                                className="ac-select-container"
                                                                classNamePrefix="ac-select"
                                                                getOptionLabel={(option: any) => option.name}
                                                                getOptionValue={(option: any) => option.id}
                                                                options={this.state.selectFieldOptions['site']}
                                                                components={{
                                                                    Option: IconOption,
                                                                    SingleValue: IconValue,
                                                                }}
                                                                onChange={chain(
                                                                    fieldArgs.fieldProps.onChange,
                                                                    this.handleSiteChange,
                                                                )}
                                                            />
                                                        );
                                                    }}
                                                </Field>
                                                {this.getCommonFieldMarkup()}
                                                {this.commonFields && this.commonFields.length === 1 && (
                                                    <div className="ac-vpadding">
                                                        <h3>
                                                            No fields found for selected project. Please choose another.
                                                        </h3>
                                                    </div>
                                                )}
                                                {this.advancedFields && this.advancedFields.length > 0 && (
                                                    <Panel isDefaultExpanded={false} header={<h4>Advanced Options</h4>}>
                                                        <div>{this.getAdvancedFieldMarkup()}</div>
                                                    </Panel>
                                                )}
                                                <FormFooter actions={{}}>
                                                    <LoadingButton
                                                        type="submit"
                                                        className="ac-button"
                                                        isDisabled={this.state.isSomethingLoading}
                                                        isLoading={this.state.loadingField === 'submitButton'}
                                                    >
                                                        Submit
                                                    </LoadingButton>
                                                </FormFooter>
                                            </form>
                                        );
                                    }}
                                </Form>
                                {this.state.transformerProblems &&
                                    Object.keys(this.state.transformerProblems).length > 0 && (
                                        <div className="fade-in" style={{ marginTop: '20px' }}>
                                            <span>non-renderable fields detected.</span>{' '}
                                            <Button
                                                className="ac-banner-link-button"
                                                appearance="link"
                                                spacing="none"
                                                onClick={() => {
                                                    this.postMessage({ action: 'openProblemReport' });
                                                }}
                                            >
                                                View a problem report
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        </GridColumn>
                    </Grid>
                </AtlascodeErrorBoundary>
            </Page>
        );
    }
}
