import Button from '@atlaskit/button';
import LoadingButton from '@atlaskit/button/loading-button';
import Form, { Field, FormFooter, FormHeader, RequiredAsterisk } from '@atlaskit/form';
import Page from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import SectionMessage from '@atlaskit/section-message';
import Select, { components } from '@atlaskit/select';
import { AsyncSelect } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, SelectFieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import * as React from 'react';

import { AnalyticsView } from '../../../../analyticsTypes';
import { DetailedSiteInfo, emptySiteInfo } from '../../../../atlclients/authInfo';
import { CreateIssueData, emptyCreateIssueData, isIssueCreated } from '../../../../ipc/issueMessaging';
import { LegacyPMFData } from '../../../../ipc/messaging';
import { AtlascodeErrorBoundary } from '../../../../react/atlascode/common/ErrorBoundary';
import { readFilesContentAsync } from '../../../../util/files';
import { AtlLoader } from '../../AtlLoader';
import ErrorBanner from '../../ErrorBanner';
import { chain } from '../../fieldValidators';
import Offline from '../../Offline';
import PMFBBanner from '../../pmfBanner';
import * as SelectFieldHelper from '../../selectFieldHelper';
import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState,
} from '../AbstractIssueEditorPage';
import JiraIssueTextAreaEditor from '../common/JiraIssueTextArea';

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
            <img src={props.data.avatarUrl} width="24" height="24" alt={props.data.name || 'Avatar'} />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={props.data.avatarUrl} width="16" height="16" alt={props.data.name || 'Avatar'} />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.SingleValue>
);

export default class CreateIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    private advancedFields: FieldUI[] = [];
    private commonFields: FieldUI[] = [];
    private attachingInProgress = false;

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
        const requiredFields = Object.values(this.state.fields).filter((field) => field.required);

        const errs: Record<string, string> = {};
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

    protected handleInlineAttachments = async (fieldkey: string, newValue: any) => {
        if (this.attachingInProgress) {
            return;
        }

        if (Array.isArray(newValue) && newValue.length > 0) {
            this.attachingInProgress = true;
            readFilesContentAsync(newValue)
                .then((filesWithContent) => {
                    const serFiles = filesWithContent.map((file) => {
                        return {
                            lastModified: file.lastModified,
                            lastModifiedDate: (file as any).lastModifiedDate,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            path: (file as any).path,
                            fileContent: file.fileContent,
                        };
                    });

                    this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: serFiles } } });
                })
                .finally(() => (this.attachingInProgress = false));
        }
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
            let valObj: Record<string, string> = {};
            const splits = field.key.split('.');
            fieldkey = splits[0];
            if (this.state.fieldValues[splits[0]]) {
                valObj = this.state.fieldValues[splits[0]];
            }
            valObj[splits[1]] = typedVal;
            typedVal = valObj;
        }

        if (field.uiType === UIType.Attachment) {
            await this.handleInlineAttachments(fieldkey, newValue);
            return;
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
        return this.advancedFields
            .filter((field) => field.key !== 'assignee' && field.key !== 'parent') //added assignee to common fields but is set by API + TODO: add parent functionality
            .map((field) => this.getInputMarkup(field));
    }

    formHeader = () => {
        return (
            <div>
                Create work item
                {this.state.isSomethingLoading && (
                    <div className="spinner" style={{ marginLeft: '15px' }}>
                        <Spinner size="medium" />
                    </div>
                )}
            </div>
        );
    };

    public render() {
        if (!this.state.fieldValues['issuetype']?.id && !this.state.isErrorBannerOpen && this.state.isOnline) {
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
                    <div
                        style={{
                            display: 'flex',
                            maxWidth: '1200px',
                            margin: '20px auto 0 auto',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{ width: '60%' }}>
                            <div style={{ width: '100%' }}>
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
                                        <SectionMessage appearance="success" title="Issue Created">
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
                                <Form name="create-issue" onSubmit={this.handleSubmit}>
                                    {(frmArgs: any) => {
                                        return (
                                            <form {...frmArgs.formProps}>
                                                <FormHeader title={this.formHeader()}>
                                                    <p>
                                                        Required fields are marked with an asterisk <RequiredAsterisk />
                                                    </p>
                                                </FormHeader>
                                                <Field
                                                    label={<span>Site</span>}
                                                    id="site"
                                                    name="site"
                                                    isRequired
                                                    defaultValue={this.state.siteDetails}
                                                >
                                                    {(fieldArgs: any) => {
                                                        return (
                                                            <Select
                                                                {...fieldArgs.fieldProps}
                                                                className="ac-form-select-container"
                                                                classNamePrefix="ac-form-select"
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
                                                {this.state.fields['project'] && (
                                                    <Field
                                                        label={<span>Project</span>}
                                                        id="project"
                                                        name="project"
                                                        isRequired
                                                        defaultValue={this.state.fieldValues['project']}
                                                    >
                                                        {(fieldArgs: any) => {
                                                            const selectField = this.state.fields['project'];
                                                            return (
                                                                <Select
                                                                    {...fieldArgs.fieldProps}
                                                                    className="ac-form-select-container"
                                                                    classNamePrefix="ac-form-select"
                                                                    getOptionLabel={(option: any) => option.name}
                                                                    getOptionValue={(option: any) => option.id}
                                                                    options={this.state.selectFieldOptions['project']}
                                                                    components={SelectFieldHelper.getComponentsForValueType(
                                                                        selectField.valueType,
                                                                    )}
                                                                    onChange={chain(
                                                                        fieldArgs.fieldProps.onChange,
                                                                        this.handleInlineEdit.bind(this, {
                                                                            key: 'project',
                                                                            valueType: ValueType.Project,
                                                                            uiType: UIType.Select,
                                                                        }),
                                                                    )}
                                                                />
                                                            );
                                                        }}
                                                    </Field>
                                                )}
                                                {this.state.fields['issuetype'] && (
                                                    <Field
                                                        label={<span>Issue Type</span>}
                                                        id="issuetype"
                                                        name="issuetype"
                                                        isRequired
                                                        defaultValue={this.state.fieldValues['issuetype']}
                                                    >
                                                        {(fieldArgs: any) => {
                                                            const selectField = this.state.fields['issuetype'];
                                                            return (
                                                                <Select
                                                                    {...fieldArgs.fieldProps}
                                                                    className="ac-form-select-container"
                                                                    classNamePrefix="ac-form-select"
                                                                    getOptionLabel={(option: any) => option.name}
                                                                    getOptionValue={(option: any) => option.id}
                                                                    options={this.state.selectFieldOptions['issuetype']}
                                                                    components={SelectFieldHelper.getComponentsForValueType(
                                                                        selectField.valueType,
                                                                    )}
                                                                    onChange={(e: any) =>
                                                                        chain(
                                                                            fieldArgs.fieldProps.onChange,
                                                                            this.handleSelectChange(selectField, e),
                                                                        )
                                                                    }
                                                                />
                                                            );
                                                        }}
                                                    </Field>
                                                )}
                                                {this.state.fields['summary'] && (
                                                    <Field
                                                        label={<span>Summary</span>}
                                                        id="summary"
                                                        name="summary"
                                                        isRequired
                                                    >
                                                        {(fieldArgs: any) => {
                                                            const selectField = this.state.fields['summary'];
                                                            return (
                                                                <Textfield
                                                                    {...fieldArgs.fieldProps}
                                                                    className="ac-inputField"
                                                                    isDisabled={this.state.isSomethingLoading}
                                                                    isRequired
                                                                    onChange={(e: any) =>
                                                                        chain(
                                                                            fieldArgs.fieldProps.onChange,
                                                                            this.handleInlineEdit(
                                                                                selectField,
                                                                                e.currentTarget.value,
                                                                            ),
                                                                        )
                                                                    }
                                                                    placeholder="What needs to be done?"
                                                                />
                                                            );
                                                        }}
                                                    </Field>
                                                )}
                                                {this.state.fields['description'] && (
                                                    <Field
                                                        label={<span>Description</span>}
                                                        id="description"
                                                        name="description"
                                                    >
                                                        {(fieldArgs: any) => {
                                                            const selectField = this.state.fields['description'];
                                                            return (
                                                                <JiraIssueTextAreaEditor
                                                                    {...fieldArgs.fieldProps}
                                                                    value={this.state.fieldValues['description']}
                                                                    isDisabled={this.state.isSomethingLoading}
                                                                    onChange={(e: any) =>
                                                                        chain(
                                                                            fieldArgs.fieldProps.onChange,
                                                                            this.handleInlineEdit(selectField, e),
                                                                        )
                                                                    }
                                                                    fetchUsers={async (input: string) =>
                                                                        (await this.fetchUsers(input)).map((user) => ({
                                                                            displayName: user.displayName,
                                                                            avatarUrl: user.avatarUrls?.['48x48'],
                                                                            mention: this.state.siteDetails.isCloud
                                                                                ? `[~accountid:${user.accountId}]`
                                                                                : `[~${user.name}]`,
                                                                        }))
                                                                    }
                                                                />
                                                            );
                                                        }}
                                                    </Field>
                                                )}
                                                {this.state.fields['assignee'] && (
                                                    <Field label={<span>Assignee</span>} id="assignee" name="assignee">
                                                        {(fieldArgs: any) => {
                                                            const selectField = this.state.fields['assignee'];
                                                            return (
                                                                <AsyncSelect
                                                                    {...fieldArgs.fieldProps}
                                                                    getOptionLabel={SelectFieldHelper.labelFuncForValueType(
                                                                        selectField.valueType,
                                                                    )}
                                                                    getOptionValue={SelectFieldHelper.valueFuncForValueType(
                                                                        selectField.valueType,
                                                                    )}
                                                                    components={SelectFieldHelper.getComponentsForValueType(
                                                                        selectField.valueType,
                                                                    )}
                                                                    className="ac-form-select-container"
                                                                    classNamePrefix="ac-form-select"
                                                                    defaultOptions={
                                                                        this.state.selectFieldOptions['assignee']
                                                                    }
                                                                    loadOptions={(e: any) =>
                                                                        this.loadSelectOptionsForField(
                                                                            selectField as SelectFieldUI,
                                                                            e,
                                                                        )
                                                                    }
                                                                    onChange={(selected: any) => {
                                                                        this.handleSelectChange(selectField, selected);
                                                                    }}
                                                                />
                                                            );
                                                        }}
                                                    </Field>
                                                )}
                                                {this.state.fields['fixVersions'] &&
                                                    this.getInputMarkup(this.state.fields['fixVersions'])}
                                                {this.state.fields['labels'] &&
                                                    this.getInputMarkup(this.state.fields['labels'])}
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
                                                        spacing="compact"
                                                        className="ac-button"
                                                        isDisabled={this.state.isSomethingLoading}
                                                        isLoading={this.state.loadingField === 'submitButton'}
                                                    >
                                                        Create
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
                        </div>
                    </div>
                </AtlascodeErrorBoundary>
            </Page>
        );
    }
}
