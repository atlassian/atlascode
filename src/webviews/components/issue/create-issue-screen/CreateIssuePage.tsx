import Button from '@atlaskit/button';
import LoadingButton from '@atlaskit/button/loading-button';
import Form, { ErrorMessage, Field, FormFooter, FormHeader, RequiredAsterisk } from '@atlaskit/form';
import Page from '@atlaskit/page';
import Select, { components } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldValues, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import * as React from 'react';
import { v4 } from 'uuid';

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
import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState,
} from '../AbstractIssueEditorPage';
import { Panel } from './Panel';

type Emit = CommonEditorPageEmit;
type Accept = CommonEditorPageAccept | CreateIssueData;
interface ViewState extends CommonEditorViewState, CreateIssueData {
    createdIssue: IssueKeyAndSite<DetailedSiteInfo>;
    formKey: string;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyCreateIssueData,
    createdIssue: { key: '', siteDetails: emptySiteInfo },
    formKey: v4(),
};

const getFaviconUrl = (siteData: any): string | null => {
    if (siteData?.baseLinkUrl) {
        return `${siteData.baseLinkUrl}/favicon.ico`;
    } else if (siteData?.host) {
        return `https://${siteData.host}/favicon.ico`;
    }
    return null;
};

const IconOption = (props: any) => {
    const fallbackImg = 'images/jira-icon.svg';
    const avatarUrl = getFaviconUrl(props.data) || fallbackImg;

    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}>
                <img
                    src={avatarUrl}
                    width="24"
                    height="24"
                    alt={props.data?.name || 'Avatar'}
                    onError={(e) => {
                        if (e.currentTarget.src !== fallbackImg) {
                            e.currentTarget.src = fallbackImg;
                        }
                    }}
                />
                <span style={{ marginLeft: '10px' }}>{props.data?.name}</span>
            </div>
        </components.Option>
    );
};

const IconValue = (props: any) => {
    const fallbackImg = 'images/jira-icon.svg';
    const avatarUrl = getFaviconUrl(props.data) || fallbackImg;

    return (
        <components.SingleValue {...props}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                    src={avatarUrl}
                    width="16"
                    height="16"
                    alt={props.data?.name || 'Avatar'}
                    onError={(e) => {
                        if (e.currentTarget.src !== fallbackImg) {
                            e.currentTarget.src = fallbackImg;
                        }
                    }}
                />
                <span style={{ marginLeft: '10px' }}>{props.data?.name}</span>
            </div>
        </components.SingleValue>
    );
};

export default class CreateIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    private advancedFields: FieldUI[] = [];
    private commonFields: FieldUI[] = [];
    private attachingInProgress = false;
    private initialFieldValues: FieldValues = {};

    getProjectKey(): string {
        return this.state.fieldValues['project'].key;
    }

    protected override getApiVersion(): string {
        return String(this.state.apiVersion);
    }

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    override onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    handled = true;
                    const issueData = e as CreateIssueData;
                    const { fieldValues } = issueData;

                    if (fieldValues) {
                        const isInitialFieldsEmpty = Object.keys(this.initialFieldValues).length === 0;
                        const hasIncomingFields = Object.keys(fieldValues).length > 0;

                        if (isInitialFieldsEmpty && hasIncomingFields) {
                            this.initialFieldValues = { ...fieldValues };
                        }

                        if (!isInitialFieldsEmpty) {
                            Object.keys(this.initialFieldValues).forEach((key) => {
                                if (key in fieldValues) {
                                    this.initialFieldValues[key] = fieldValues[key];
                                }
                            });
                        }
                    }

                    this.updateInternals(issueData);
                    this.setState(issueData, () => {
                        this.setState({
                            isSomethingLoading: false,
                            loadingField: '',
                        });
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
                            createdIssue: e.issueData,
                            fieldValues: this.initialFieldValues,
                            formKey: v4(),
                        });
                        // Refresh sidebar tree views after successful issue creation
                        this.postMessage({
                            action: 'refreshTreeViews',
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
            //we want assignee field in common
            if (field.advanced && field.key !== 'assignee') {
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

    protected override handleInlineEdit = async (field: FieldUI, newValue: any) => {
        let typedVal = newValue;
        let fieldkey = field.key;

        if (typedVal === undefined) {
            this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: typedVal } } });
            return;
        }

        if (field.valueType === ValueType.Number && typeof newValue !== 'number') {
            typedVal = parseFloat(newValue);
            if (isNaN(typedVal)) {
                this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: undefined } } });
                return;
            }
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
        } else if (field.valueType === ValueType.IssueType) {
            this.setState({ loadingField: field.key, isSomethingLoading: true });
            this.postMessage({
                action: 'setIssueType',
                issueType: newValue,
                fieldValues: this.state.fieldValues,
            });
        } else {
            this.setState({ isSomethingLoading: false, loadingField: '' });
        }
    };

    fetchUsers = (input: string) => {
        const apiVersion = this.getApiVersion();
        const userSearchUrl = this.state.siteDetails.isCloud
            ? `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?query=`
            : `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?username=`;

        return this.loadSelectOptions(input, userSearchUrl);
    };

    private getFieldError(fieldKey: string): string | undefined {
        if (fieldKey === 'project' && this.state?.selectFieldOptions?.project?.length === 0) {
            return "You don't have write access to any projects on the selected Jira site";
        }
        return;
    }

    getCommonFieldMarkup(): React.ReactElement[] {
        return this.commonFields.map((field, index) => {
            const errorMessage = this.getFieldError(field.key);
            if (errorMessage) {
                return (
                    <div key={index}>
                        {this.getInputMarkup(field)}
                        <ErrorMessage>{errorMessage}</ErrorMessage>
                    </div>
                );
            }
            return <div key={index}>{this.getInputMarkup(field)}</div>;
        });
    }

    getAdvancedFieldMarkup(): any {
        // Cloud supports parent-child relation only for all issues. DC supports parent-child for standard-issues and subtasks
        if (this.state.siteDetails.isCloud) {
            return this.advancedFields.map((field) =>
                this.getInputMarkup(field, false, this.state.fieldValues['issuetype']),
            );
        } else {
            return this.advancedFields
                .filter((field) => field.key !== 'parent') //
                .map((field) => this.getInputMarkup(field));
        }
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

    public override render() {
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
                            margin: '20px auto 36px auto',
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
                                {this.state.isErrorBannerOpen && (
                                    <ErrorBanner
                                        onDismissError={this.handleDismissError}
                                        errorDetails={this.state.errorDetails}
                                    />
                                )}
                                <Form name="create-issue" key={this.state.formKey} onSubmit={this.handleSubmit}>
                                    {(frmArgs: any) => {
                                        return (
                                            <form {...frmArgs.formProps}>
                                                <FormHeader title={this.formHeader()}>
                                                    <p>
                                                        Required fields are marked with an asterisk <RequiredAsterisk />
                                                    </p>
                                                </FormHeader>
                                                <Field label={<span>Site</span>} id="site" name="site" isRequired>
                                                    {(fieldArgs: any) => {
                                                        return (
                                                            <Select
                                                                {...fieldArgs.fieldProps}
                                                                value={this.state.siteDetails}
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
                                                {this.commonFields && this.commonFields.length > 0 && (
                                                    <div>{this.getCommonFieldMarkup()}</div>
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
