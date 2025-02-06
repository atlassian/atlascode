import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker, DateTimePicker } from '@atlaskit/datetime-picker';
import { CheckboxField, ErrorMessage, Field, Fieldset, HelperMessage } from '@atlaskit/form';
import Lozenge from '@atlaskit/lozenge';
import { RadioGroup } from '@atlaskit/radio';
import Select, { AsyncCreatableSelect, AsyncSelect, CreatableSelect } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import {
    CommentVisibility,
    IssuePickerIssue,
    JsdInternalCommentVisibility,
    MinimalIssueOrKeyAndSite,
} from '@atlassianlabs/jira-pi-common-models';
import {
    FieldUI,
    FieldUIs,
    FieldValues,
    InputFieldUI,
    OptionableFieldUI,
    SelectFieldUI,
    UIType,
    ValueType,
} from '@atlassianlabs/jira-pi-meta-models';
import { formatDistanceToNow } from 'date-fns';
import debounce from 'lodash.debounce';
import * as React from 'react';
import EdiText, { EdiTextType } from 'react-editext';
import uuid from 'uuid';
import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import {
    CreatedSelectOption,
    isIssueEditError,
    IssueEditError,
    IssueSuggestionsList,
    LabelList,
    UserList,
} from '../../../ipc/issueMessaging';
import { Action, HostErrorMessage, Message } from '../../../ipc/messaging';
import { ConnectionTimeout } from '../../../util/time';
import { colorToLozengeAppearanceMap } from '../colors';
import * as FieldValidators from '../fieldValidators';
import * as SelectFieldHelper from '../selectFieldHelper';
import { WebviewComponent } from '../WebviewComponent';
import { AttachmentForm } from './AttachmentForm';
import { EditRenderedTextArea } from './EditRenderedTextArea';
import InlineIssueLinksEditor from './InlineIssueLinkEditor';
import InlineSubtaskEditor from './InlineSubtaskEditor';
import { ParticipantList } from './ParticipantList';
import { TextAreaEditor } from './TextAreaEditor';
import * as l10n from '@vscode/l10n';

type Func = (...args: any[]) => any;
type FuncOrUndefined = Func | undefined;

export type CommonEditorPageEmit = Action | OpenJiraIssueAction;
export type CommonEditorPageAccept = CreatedSelectOption | LabelList | UserList | HostErrorMessage | IssueEditError;

export interface CommonEditorViewState extends Message {
    siteDetails: DetailedSiteInfo;
    fieldValues: FieldValues;
    selectFieldOptions: { [k: string]: any[] };
    isSomethingLoading: boolean;
    loadingField: string;
    editingField: string;
    isOnline: boolean;
    isErrorBannerOpen: boolean;
    showPMF: boolean;
    errorDetails: any;
    commentInputValue: string;
}

export const emptyCommonEditorState: CommonEditorViewState = {
    type: '',
    siteDetails: emptySiteInfo,
    fieldValues: {},
    selectFieldOptions: {},
    isSomethingLoading: false,
    loadingField: '',
    editingField: '',
    isOnline: true,
    showPMF: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    commentInputValue: '',
};

const shouldShowCreateOption = (inputValue: any, selectValue: any, selectOptions: any[]) => {
    if (inputValue.trim().length === 0 || selectOptions.find((option) => option.name === inputValue)) {
        return false;
    }

    return true;
};

export abstract class AbstractIssueEditorPage<
    EA extends CommonEditorPageEmit,
    ER,
    EP,
    ES extends CommonEditorViewState,
> extends WebviewComponent<EA, ER, EP, ES> {
    abstract getProjectKey(): string;
    abstract fetchUsers: (input: string) => Promise<any[]>;

    protected handleInlineEdit = (field: FieldUI, newValue: any): Promise<void> => {
        return Promise.resolve();
    };
    protected handleCreateComment = (commentBody: string, restriction?: CommentVisibility) => {};

    // react-select has issues and doesn't stop propagation on click events when you provide
    // a custom option component.  e.g. it calls this twice, so we have to debounce.
    // see: https://github.com/JedWatson/react-select/issues/2477
    // and more importantly: https://github.com/JedWatson/react-select/issues/2326
    protected handleSelectChange = debounce((field: FieldUI, newValue: any) => {
        this.handleInlineEdit(field, this.formatEditValue(field, newValue));
    }, 100);

    protected formatEditValue(field: FieldUI, newValue: any): any {
        let val = newValue;

        if (val === undefined || val === null) {
            return undefined;
        }

        if (
            (field.valueType === ValueType.String || field.valueType === ValueType.Number) &&
            typeof newValue !== 'string' &&
            typeof newValue !== 'number'
        ) {
            if (Array.isArray(newValue)) {
                val = newValue.map((aryValue) => {
                    if (typeof aryValue === 'object') {
                        return aryValue.value;
                    }
                    return aryValue;
                });
            } else {
                val = newValue.value;
            }
        } else if (field.valueType === ValueType.Group) {
            val = { name: newValue.value };
        }

        return val;
    }

    onMessageReceived(e: any): boolean {
        let handled: boolean = false;
        switch (e.type) {
            case 'error': {
                handled = true;
                if (isIssueEditError(e)) {
                    this.setState({
                        isSomethingLoading: false,
                        loadingField: '',
                        isErrorBannerOpen: true,
                        errorDetails: e.reason,
                        fieldValues: { ...this.state.fieldValues, ...e.fieldValues },
                    });
                } else {
                    this.setState({
                        isSomethingLoading: false,
                        loadingField: '',
                        isErrorBannerOpen: true,
                        errorDetails: e.reason,
                    });
                }
                break;
            }
            case 'fieldValueUpdate': {
                handled = true;
                this.setState({
                    isSomethingLoading: false,
                    loadingField: '',
                    fieldValues: { ...this.state.fieldValues, ...e.fieldValues },
                });
                break;
            }
            case 'pmfStatus': {
                this.setState({ showPMF: e.showPMF });
                break;
            }
        }

        return handled;
    }

    postMessage<T extends CommonEditorPageEmit>(e: T) {
        this._api.postMessage(e);
    }

    protected isClearableSelect = (field: SelectFieldUI): boolean => {
        if (!field.required) {
            return true;
        }

        if (field.isMulti && this.state.fieldValues[field.key] && this.state.fieldValues[field.key].length > 0) {
            return true;
        }

        return false;
    };

    private handleExternalCommentSave = (e: any) => {
        this.handleCreateComment(this.state.commentInputValue);
        this.setState({ commentInputValue: '' });
    };

    private handleInternalCommentSave = (e: any) => {
        this.handleCreateComment(this.state.commentInputValue, JsdInternalCommentVisibility);
        this.setState({ commentInputValue: '' });
    };

    private handleCommentCancelClick = (e: any) => {
        this.setState({ commentInputValue: '' });
    };

    protected sortFieldValues(fields: FieldUIs): FieldUI[] {
        return Object.values(fields).sort((left: FieldUI, right: FieldUI) => {
            if (left.displayOrder < right.displayOrder) {
                return -1;
            }
            if (left.displayOrder > right.displayOrder) {
                return 1;
            }
            return 0;
        });
    }

    protected handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    protected handleOpenIssue = (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => {
        let issueObj = issueOrKey;

        if (typeof issueOrKey === 'string') {
            issueObj = { key: issueOrKey, siteDetails: this.state.siteDetails };
        }

        const nonce: string = uuid.v4();
        this.postMessage({
            action: 'openJiraIssue',
            issueOrKey: issueObj,
            nonce: nonce,
        });
    };

    private handleInlineInputEdit = (field: FieldUI, e: any) => {
        const val: string = e.target.value;
        this.handleInlineEdit(field, val);
    };

    private handleCreateModeAttachments = (files: any[], field?: FieldUI) => {
        if (field) {
            this.handleInlineEdit(field, files);
        }
    };

    protected loadIssueOptions = (field: SelectFieldUI, input: string): Promise<IssuePickerIssue[]> => {
        return new Promise((resolve) => {
            const nonce: string = uuid.v4();
            // this.postMessage({ action: 'fetchIssues', query: input, site: this.state.siteDetails, autocompleteUrl: field.autoCompleteUrl, nonce: nonce });
            (async () => {
                try {
                    const listEvent = await this.postMessageWithEventPromise(
                        {
                            action: 'fetchIssues',
                            query: input,
                            site: this.state.siteDetails,
                            autocompleteUrl: field.autoCompleteUrl,
                            nonce: nonce,
                        },
                        'issueSuggestionsList',
                        ConnectionTimeout,
                        nonce,
                    );
                    resolve((listEvent as IssueSuggestionsList).issues);
                } catch (e) {
                    resolve([]);
                }
            })();
        });
    };

    /**
     * AXON-49 This is a workaround for the suggested autocomplete URL
     * (.../user/recommend/...) not being accessible
     */
    protected fixAutocompleteUrl(url: string): string {
        if (url.includes('user/recommend')) {
            url = url.replace('user/recommend', 'user/search') + '&query=';
        }

        return url;
    }

    protected loadSelectOptionsForField = (field: SelectFieldUI, input: string): Promise<any[]> => {
        this.setState({ isSomethingLoading: true, loadingField: field.key });
        return this.loadSelectOptions(input, this.fixAutocompleteUrl(field.autoCompleteUrl));
    };

    protected loadSelectOptions = (input: string, url: string): Promise<any[]> => {
        this.setState({ isSomethingLoading: true });
        return new Promise((resolve) => {
            const nonce: string = uuid.v4();
            (async () => {
                try {
                    const listEvent = await this.postMessageWithEventPromise(
                        {
                            action: 'fetchSelectOptions',
                            query: input,
                            site: this.state.siteDetails,
                            autocompleteUrl: url,
                            nonce,
                        },
                        'selectOptionsList',
                        ConnectionTimeout,
                        nonce,
                    );

                    this.setState({ isSomethingLoading: false });
                    resolve(listEvent.options);
                } catch (e) {
                    this.setState({ isSomethingLoading: false });
                    resolve([]);
                }
            })();
        });
    };

    // react-select has issues and doesn't stop propagation on click events when you provide
    // a custom option component.  e.g. it calls this twice, so we have to debounce.
    // see: https://github.com/JedWatson/react-select/issues/2477
    // and more importantly: https://github.com/JedWatson/react-select/issues/2326
    handleSelectOptionCreate = debounce((field: SelectFieldUI, input: string): void => {
        if (field.createUrl.trim() !== '') {
            this.setState({ isSomethingLoading: true, loadingField: field.key });
            const nonce: string = uuid.v4();

            (async () => {
                try {
                    const createEvent = await this.postMessageWithEventPromise(
                        {
                            action: 'createOption',
                            fieldKey: field.key,
                            siteDetails: this.state.siteDetails,
                            createUrl: field.createUrl,
                            createData: { name: input, project: this.getProjectKey() },
                            nonce: nonce,
                        },
                        'optionCreated',
                        ConnectionTimeout,
                        nonce,
                    );

                    this.setState({
                        isSomethingLoading: false,
                        loadingField: '',
                        fieldValues: { ...this.state.fieldValues, ...createEvent.fieldValues },
                        selectFieldOptions: {
                            ...this.state.selectFieldOptions,
                            ...createEvent.selectFieldOptions,
                        },
                    });
                } catch (e) {
                    this.setState({ isSomethingLoading: false });
                }
            })();
        }
    }, 100);

    protected getInputMarkup(field: FieldUI, editmode: boolean = false): any {
        switch (field.uiType) {
            case UIType.Input: {
                let validateFunc = this.getValidateFunction(field, editmode);
                let validationFailMessage = '';
                let valType = field.valueType;

                const defaultVal =
                    this.state.fieldValues[field.key] === undefined ? '' : this.state.fieldValues[field.key];
                switch (valType) {
                    case ValueType.Number: {
                        validationFailMessage = `${field.name} must be a number`;
                        break;
                    }
                    case ValueType.Url: {
                        validationFailMessage = `${field.name} must be a URL`;
                        break;
                    }
                    default: {
                        if (field.required) {
                            validationFailMessage = `${field.name} is required`;
                        }
                        break;
                    }
                }

                if (editmode) {
                    let markup: React.ReactNode = <p></p>;

                    if ((field as InputFieldUI).isMultiline) {
                        markup = (
                            <EditRenderedTextArea
                                text={this.state.fieldValues[`${field.key}`]}
                                renderedText={this.state.fieldValues[`${field.key}.rendered`]}
                                fetchUsers={async (input: string) =>
                                    (await this.fetchUsers(input)).map((user) => ({
                                        displayName: user.displayName,
                                        avatarUrl: user.avatarUrls?.['48x48'],
                                        mention: this.state.siteDetails.isCloud
                                            ? `[~accountid:${user.accountId}]`
                                            : `[~${user.name}]`,
                                    }))
                                }
                                onSave={async (val: string) => {
                                    await this.handleInlineEdit(field, val);
                                }}
                                fetchImage={async (url: string) => {
                                    const nonce = uuid.v4();
                                    return (
                                        await this.postMessageWithEventPromise(
                                            {
                                                action: 'getImage',
                                                nonce: nonce,
                                                url: url,
                                            },
                                            'getImageDone',
                                            ConnectionTimeout,
                                            nonce,
                                        )
                                    ).imgData;
                                }}
                            />
                        );
                    } else {
                        markup = (
                            <EdiText
                                type={this.inlineEditTypeForValueType(field.valueType)}
                                value={defaultVal}
                                onSave={(val: string) => {
                                    this.handleInlineEdit(field, val);
                                }}
                                validation={validateFunc}
                                validationMessage={validationFailMessage}
                                inputProps={{ className: 'ac-inputField' }}
                                viewProps={{ id: field.key, className: 'ac-inline-input-view-p' }}
                                editButtonClassName="ac-hidden"
                                cancelButtonClassName="ac-inline-cancel-button"
                                saveButtonClassName="ac-inline-save-button"
                                editOnViewClick={true}
                            />
                        );
                    }
                    return markup;
                }

                return (
                    <Field
                        defaultValue={defaultVal}
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {(fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error && fieldArgs.error !== '') {
                                errDiv = <ErrorMessage>{validationFailMessage}</ErrorMessage>;
                            }

                            let markup = (
                                <input
                                    {...fieldArgs.fieldProps}
                                    style={{ width: '100%', display: 'block' }}
                                    className="ac-inputField"
                                    disabled={this.state.isSomethingLoading}
                                    onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                        this.handleInlineInputEdit(field, val);
                                    })}
                                />
                            );
                            if ((field as InputFieldUI).isMultiline) {
                                markup = (
                                    <TextAreaEditor
                                        {...fieldArgs.fieldProps}
                                        rows={5}
                                        fetchUsers={async (input: string) =>
                                            (await this.fetchUsers(input)).map((user) => ({
                                                displayName: user.displayName,
                                                avatarUrl: user.avatarUrls?.['48x48'],
                                                mention: this.state.siteDetails.isCloud
                                                    ? `[~accountid:${user.accountId}]`
                                                    : `[~${user.name}]`,
                                            }))
                                        }
                                        disabled={this.state.isSomethingLoading}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                            this.handleInlineEdit(field, val);
                                        })}
                                    />
                                );
                            }
                            return (
                                <div>
                                    {markup}
                                    {errDiv}
                                </div>
                            );
                        }}
                    </Field>
                );
            }
            case UIType.Date: {
                let markup = <div></div>;
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = (
                        <DatePicker
                            id={field.key}
                            name={field.key}
                            isLoading={this.state.loadingField === field.key}
                            defaultValue={this.state.fieldValues[field.key]}
                            isDisabled={this.state.isSomethingLoading}
                            className="ac-select-container"
                            selectProps={{ className: 'ac-select-container', classNamePrefix: 'ac-select' }}
                            onChange={(val: string) => {
                                // DatePicker re-opens when it gains focus with no way to turn that off.
                                // this is why we have to blur so a re-render doesn't re-open it.
                                (document.activeElement as HTMLElement).blur();
                                this.handleInlineEdit(field, val);
                            }}
                        />
                    );

                    return markup;
                }

                return (
                    <Field
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {(fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error === 'EMPTY') {
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }
                            return (
                                <div>
                                    <DatePicker
                                        {...fieldArgs.fieldProps}
                                        isDisabled={this.state.isSomethingLoading}
                                        className="ac-select-container"
                                        selectProps={{
                                            className: 'ac-select-container',
                                            classNamePrefix: 'ac-select',
                                        }}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                            this.handleInlineEdit(field, val);
                                        })}
                                    />
                                    {errDiv}
                                </div>
                            );
                        }}
                    </Field>
                );
            }
            case UIType.DateTime: {
                let markup = <div></div>;
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = (
                        <DateTimePicker
                            id={field.key}
                            name={field.key}
                            defaultValue={this.state.fieldValues[field.key]}
                            isDisabled={this.state.isSomethingLoading}
                            className="ac-select-container"
                            datePickerSelectProps={{
                                className: 'ac-select-container',
                                classNamePrefix: 'ac-select',
                            }}
                            timePickerSelectProps={{
                                className: 'ac-select-container',
                                classNamePrefix: 'ac-select',
                            }}
                            onChange={(val: string) => {
                                // DatePicker re-opens when it gains focus with no way to turn that off.
                                // this is why we have to blur so a re-render doesn't re-open it.
                                (document.activeElement as HTMLElement).blur();
                                this.handleInlineEdit(field, val);
                            }}
                        />
                    );

                    return markup;
                }

                return (
                    <Field
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {(fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error === 'EMPTY') {
                                errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                            }
                            return (
                                <div>
                                    <DateTimePicker
                                        {...fieldArgs.fieldProps}
                                        isDisabled={this.state.isSomethingLoading}
                                        className="ac-select-container"
                                        datePickerSelectProps={{
                                            className: 'ac-select-container',
                                            classNamePrefix: 'ac-select',
                                        }}
                                        timePickerSelectProps={{
                                            className: 'ac-select-container',
                                            classNamePrefix: 'ac-select',
                                        }}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                            this.handleInlineEdit(field, val);
                                        })}
                                    />
                                    {errDiv}
                                </div>
                            );
                        }}
                    </Field>
                );
            }
            case UIType.Subtasks: {
                let markup = <React.Fragment />;
                if (editmode) {
                    markup = (
                        <InlineSubtaskEditor
                            label={field.name}
                            subtaskTypes={this.state.selectFieldOptions[field.key]}
                            onSave={(val: any) => {
                                this.handleInlineEdit(field, val);
                            }}
                            isLoading={this.state.loadingField === field.key}
                        />
                    );
                }
                return markup;
            }

            case UIType.IssueLinks: {
                let markup = <div></div>;
                if (editmode) {
                    markup = (
                        <InlineIssueLinksEditor
                            label={field.name}
                            linkTypes={this.state.selectFieldOptions[field.key]}
                            onSave={(val: any) => {
                                this.handleInlineEdit(field, val);
                            }}
                            isLoading={this.state.loadingField === field.key}
                            //onFetchIssues={async (input: string) => ReactPromiseUtil.debouncePromise<IssuePickerIssue[]>(() => this.loadIssueOptions(field as SelectFieldUI, input), 100)()}
                            onFetchIssues={async (input: string) =>
                                await this.loadIssueOptions(field as SelectFieldUI, input)
                            }
                        />
                    );
                } else {
                    let validateFunc = field.required ? FieldValidators.validateSingleSelect : undefined;
                    return (
                        <React.Fragment>
                            <Field
                                label={field.name}
                                isRequired={field.required}
                                id={`${field.key}.type`}
                                name={`${field.key}.type`}
                                validate={validateFunc}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                                    }

                                    return (
                                        <div>
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                isMulti={false}
                                                isClearable={!field.required}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                components={SelectFieldHelper.getComponentsForValueType(
                                                    ValueType.IssueLinks,
                                                )}
                                                getOptionLabel={SelectFieldHelper.labelFuncForValueType(
                                                    ValueType.IssueLinks,
                                                )}
                                                getOptionValue={SelectFieldHelper.valueFuncForValueType(
                                                    ValueType.IssueLinks,
                                                )}
                                                placeholder="Select link type"
                                                isDisabled={this.state.isSomethingLoading}
                                                options={this.state.selectFieldOptions[field.key]}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (val: any) => {
                                                        const subField = {
                                                            ...field,
                                                            ...{ key: `${field.key}.type` },
                                                        };
                                                        this.handleInlineEdit(subField, val);
                                                    },
                                                )}
                                            />
                                            {errDiv}
                                        </div>
                                    );
                                }}
                            </Field>
                            <Field id={`${field.key}.issue`} name={`${field.key}.issue`}>
                                {(fieldArgs: any) => {
                                    return (
                                        <AsyncSelect
                                            {...fieldArgs.fieldProps}
                                            isClearable={true}
                                            isMulti={true}
                                            className="ac-select-container"
                                            classNamePrefix="ac-select"
                                            loadOptions={async (input: string) =>
                                                await this.loadIssueOptions(field as SelectFieldUI, input)
                                            }
                                            getOptionLabel={(option: any) => option.key}
                                            getOptionValue={(option: any) => option.key}
                                            placeholder={l10n.t('Search for an issue')}
                                            isLoading={this.state.loadingField === field.key}
                                            isDisabled={this.state.isSomethingLoading}
                                            onChange={FieldValidators.chain(
                                                fieldArgs.fieldProps.onChange,
                                                (val: any) => {
                                                    const subField = {
                                                        ...field,
                                                        ...{ key: `${field.key}.issue` },
                                                    };
                                                    this.handleInlineEdit(subField, val);
                                                },
                                            )}
                                            components={{
                                                Option: SelectFieldHelper.IssueSuggestionOption,
                                                SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                            }}
                                        />
                                    );
                                }}
                            </Field>
                        </React.Fragment>
                    );
                }
                return markup;
            }
            case UIType.Comments: {
                const isServiceDeskProject =
                    this.state.fieldValues['project'] &&
                    this.state.fieldValues['project'].projectTypeKey === 'service_desk';

                return (
                    <div style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}>
                        {this.state.loadingField === field.key && <Spinner size="large" />}
                        <TextAreaEditor
                            value={this.state.commentInputValue}
                            fetchUsers={async (input: string) =>
                                (await this.fetchUsers(input)).map((user) => ({
                                    displayName: user.displayName,
                                    avatarUrl: user.avatarUrls?.['48x48'],
                                    mention: this.state.siteDetails.isCloud
                                        ? `[~accountid:${user.accountId}]`
                                        : `[~${user.name}]`,
                                }))
                            }
                            placeholder={l10n.t('Add a comment...')}
                            disabled={false}
                            onChange={(input: string) => this.setState({ commentInputValue: input })}
                        />

                        <ButtonGroup>
                            <Button
                                className="ac-button"
                                onClick={this.handleExternalCommentSave}
                                isDisabled={this.state.commentInputValue === '' || this.state.isSomethingLoading}
                            >
                                {isServiceDeskProject ? l10n.t('Reply to customer') : l10n.t('Save')}
                            </Button>
                            {isServiceDeskProject && (
                                <Button
                                    className="ac-button"
                                    onClick={this.handleInternalCommentSave}
                                    isDisabled={this.state.commentInputValue === '' || this.state.isSomethingLoading}
                                >
                                    Add internal note
                                </Button>
                            )}
                            <Button appearance="default" onClick={this.handleCommentCancelClick}>
                                Cancel
                            </Button>
                        </ButtonGroup>
                    </div>
                );
            }
            case UIType.Select: {
                const selectField = field as SelectFieldUI;

                let validateFunc = undefined;
                if (field.required) {
                    validateFunc = selectField.isMulti
                        ? FieldValidators.validateMultiSelect
                        : FieldValidators.validateSingleSelect;
                }

                // Note: react-select doesn't let you set an initial value as a string.
                // it must be an object or an array (ugh.)
                let defVal = this.state.fieldValues[field.key];
                if (
                    typeof this.state.fieldValues[field.key] === 'string' ||
                    typeof this.state.fieldValues[field.key] === 'number'
                ) {
                    defVal = { label: '' + defVal, value: '' + defVal };
                }

                const commonProps: any = {
                    isMulti: selectField.isMulti,
                    className: 'ac-select-container',
                    classNamePrefix: 'ac-select',
                    getOptionLabel: SelectFieldHelper.labelFuncForValueType(selectField.valueType),
                    getOptionValue: SelectFieldHelper.valueFuncForValueType(selectField.valueType),
                    components: SelectFieldHelper.getComponentsForValueType(selectField.valueType),
                };

                if (editmode) {
                    commonProps.label = field.name;
                    commonProps.id = field.key;
                    commonProps.name = field.key;
                    commonProps.value = defVal;
                }

                switch (SelectFieldHelper.selectComponentType(selectField)) {
                    case SelectFieldHelper.SelectComponentType.Select: {
                        if (editmode) {
                            return (
                                <Select
                                    {...commonProps}
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                />
                            );
                        }

                        // create mode
                        return (
                            <Field
                                label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={defVal}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                                    }
                                    return (
                                        <React.Fragment>
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                isClearable={this.isClearableSelect(selectField)}
                                                options={this.state.selectFieldOptions[field.key]}
                                                isDisabled={this.state.isSomethingLoading}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                            />
                                            {errDiv}
                                        </React.Fragment>
                                    );
                                }}
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.Creatable: {
                        if (editmode) {
                            return (
                                <CreatableSelect
                                    {...commonProps}
                                    placeholder={l10n.t('Type to create new option')}
                                    createOptionPosition="first"
                                    value={this.state.fieldValues[field.key]}
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    noOptionsMessage={(input: any) => l10n.t('Type to create new option')}
                                    onCreateOption={(input: any): void => {
                                        this.handleSelectOptionCreate(selectField, input);
                                    }}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                />
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={defVal}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                                    }
                                    return (
                                        <React.Fragment>
                                            <CreatableSelect
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                placeholder={l10n.t('Type to create new option')}
                                                createOptionPosition="first"
                                                noOptionsMessage={(input: any) => l10n.t('Type to create new option')}
                                                isClearable={this.isClearableSelect(selectField)}
                                                options={this.state.selectFieldOptions[field.key]}
                                                isDisabled={this.state.isSomethingLoading}
                                                isLoading={this.state.loadingField === field.key}
                                                isValidNewOption={shouldShowCreateOption}
                                                onCreateOption={(input: any): void => {
                                                    this.handleSelectOptionCreate(selectField, input);
                                                }}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                            />
                                            {errDiv}
                                        </React.Fragment>
                                    );
                                }}
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.Async: {
                        if (editmode) {
                            return (
                                <AsyncSelect
                                    {...commonProps}
                                    placeholder={l10n.t('Type to search')}
                                    noOptionsMessage={(input: any) => l10n.t('Type to search')}
                                    isClearable={this.isClearableSelect(selectField)}
                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                    defaultOptions={this.state.selectFieldOptions[field.key]}
                                    isLoading={this.state.loadingField === field.key}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                    loadOptions={async (input: any) =>
                                        await this.loadSelectOptionsForField(field as SelectFieldUI, input)
                                    }
                                />
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={defVal}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                                    }
                                    return (
                                        <React.Fragment>
                                            <AsyncSelect
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                placeholder={l10n.t('Type to search')}
                                                noOptionsMessage={(input: any) => l10n.t('Type to search')}
                                                isDisabled={
                                                    this.state.isSomethingLoading &&
                                                    this.state.loadingField !== field.key
                                                }
                                                isClearable={this.isClearableSelect(selectField)}
                                                defaultOptions={this.state.selectFieldOptions[field.key]}
                                                isLoading={this.state.loadingField === field.key}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                                loadOptions={async (input: any) =>
                                                    await this.loadSelectOptionsForField(field as SelectFieldUI, input)
                                                }
                                            />
                                            {errDiv}
                                        </React.Fragment>
                                    );
                                }}
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.AsyncCreatable: {
                        let onCreateFunc: any = undefined;
                        let newDataValue: any = undefined;

                        if (selectField.createUrl.trim() !== '') {
                            onCreateFunc = (input: any): void => {
                                this.handleSelectOptionCreate(selectField, input);
                            };
                        } else {
                            newDataValue = (inputValue: any, optionLabel: any) => {
                                return { label: inputValue, value: inputValue };
                            };
                        }

                        if (editmode) {
                            return (
                                <AsyncCreatableSelect
                                    {...commonProps}
                                    placeholder={l10n.t('Type to search')}
                                    createOptionPosition="first"
                                    value={this.state.fieldValues[field.key]}
                                    noOptionsMessage={(input: any) => l10n.t('Type to search')}
                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                    isClearable={this.isClearableSelect(selectField)}
                                    defaultOptions={this.state.selectFieldOptions[field.key]}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    onCreateOption={onCreateFunc}
                                    getNewOptionData={newDataValue}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                    loadOptions={async (input: any) =>
                                        await this.loadSelectOptionsForField(field as SelectFieldUI, input)
                                    }
                                ></AsyncCreatableSelect>
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={defVal}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                    }
                                    return (
                                        <React.Fragment>
                                            <AsyncCreatableSelect
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                placeholder={l10n.t('Type to search')}
                                                createOptionPosition="first"
                                                noOptionsMessage={(input: any) => l10n.t('Type to search')}
                                                isDisabled={
                                                    this.state.isSomethingLoading &&
                                                    this.state.loadingField !== field.key
                                                }
                                                isClearable={this.isClearableSelect(selectField)}
                                                defaultOptions={this.state.selectFieldOptions[field.key]}
                                                isLoading={this.state.loadingField === field.key}
                                                isValidNewOption={shouldShowCreateOption}
                                                onCreateOption={onCreateFunc}
                                                getNewOptionData={newDataValue}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                                loadOptions={async (input: any) =>
                                                    await this.loadSelectOptionsForField(field as SelectFieldUI, input)
                                                }
                                            ></AsyncCreatableSelect>
                                            {errDiv}
                                        </React.Fragment>
                                    );
                                }}
                            </Field>
                        );
                    }
                }
            }
            case UIType.Checkbox: {
                if (editmode) {
                    const optionableField = field as OptionableFieldUI;

                    const commonProps: any = {
                        isMulti: true,
                        className: 'ac-select-container',
                        classNamePrefix: 'ac-select',
                        getOptionLabel: SelectFieldHelper.labelFuncForValueType(field.valueType),
                        getOptionValue: SelectFieldHelper.valueFuncForValueType(field.valueType),
                        components: SelectFieldHelper.getComponentsForValueType(field.valueType),
                        label: field.name,
                        id: field.key,
                        name: field.key,
                        defaultValue: this.state.fieldValues[field.key],
                        isClearable: true,
                    };

                    return (
                        <Select
                            {...commonProps}
                            isClearable={true}
                            options={optionableField.allowedValues}
                            isDisabled={this.state.isSomethingLoading}
                            onChange={(selected: any) => {
                                this.handleSelectChange(optionableField, selected);
                            }}
                        />
                    );
                }

                let checkboxItems: any[] = [];
                const checkField = field as OptionableFieldUI;
                checkField.allowedValues.forEach((value) => {
                    checkboxItems.push(
                        <CheckboxField name={field.key} id={field.key} value={value.id} isRequired={field.required}>
                            {(fieldArgs: any) => {
                                return (
                                    <Checkbox
                                        {...fieldArgs.fieldProps}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (e: any) => {
                                            this.handleInlineEdit(field, e.target.checked);
                                        })}
                                        label={value.value}
                                    />
                                );
                            }}
                        </CheckboxField>,
                    );
                });

                return <Fieldset legend={field.name}>{checkboxItems}</Fieldset>;
            }
            case UIType.Radio: {
                if (editmode) {
                    const optionableField = field as OptionableFieldUI;

                    const commonProps: any = {
                        isMulti: false,
                        className: 'ac-select-container',
                        classNamePrefix: 'ac-select',
                        getOptionLabel: SelectFieldHelper.labelFuncForValueType(field.valueType),
                        getOptionValue: SelectFieldHelper.valueFuncForValueType(field.valueType),
                        components: SelectFieldHelper.getComponentsForValueType(field.valueType),
                        label: field.name,
                        id: field.key,
                        name: field.key,
                        defaultValue: this.state.fieldValues[field.key],
                        isClearable: !field.required,
                    };

                    return (
                        <Select
                            {...commonProps}
                            isClearable={true}
                            options={optionableField.allowedValues}
                            isDisabled={this.state.isSomethingLoading}
                            onChange={(selected: any) => {
                                this.handleSelectChange(optionableField, selected);
                            }}
                        />
                    );
                }

                let radioItems: any[] = [];
                const radioField = field as OptionableFieldUI;
                radioField.allowedValues.forEach((value) => {
                    radioItems.push({ name: field.key, label: value.value, value: value.id });
                });

                let validateFunc = field.required ? FieldValidators.validateMultiSelect : undefined;
                return (
                    <Field
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {(fieldArgs: any) => {
                            return (
                                <RadioGroup
                                    {...fieldArgs.fieldProps}
                                    onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                        this.handleInlineEdit(field, val);
                                    })}
                                    options={radioItems}
                                />
                            );
                        }}
                    </Field>
                );
            }
            case UIType.Timetracking: {
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    const hasValue: boolean =
                        this.state.fieldValues[field.key] &&
                        this.state.fieldValues[field.key].originalEstimate &&
                        this.state.fieldValues[field.key].originalEstimate.trim() !== '';
                    return (
                        <div>
                            <EdiText
                                type="text"
                                value={hasValue ? this.state.fieldValues[field.key].originalEstimate : '0m'}
                                onSave={(val: string) => {
                                    this.handleInlineEdit(field, val);
                                }}
                                inputProps={{ className: 'ac-inputField' }}
                                viewProps={{ id: field.key, className: 'ac-inline-input-view-p' }}
                                editButtonClassName="ac-hidden"
                                cancelButtonClassName="ac-inline-cancel-button"
                                saveButtonClassName="ac-inline-save-button"
                                editOnViewClick={true}
                            />
                            <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                        </div>
                    );
                }

                return (
                    <div className="ac-flex">
                        <Field
                            label={l10n.t('Original estimate')}
                            isRequired={field.required}
                            id={`${field.key}.originalEstimate`}
                            name={`${field.key}.originalEstimate`}
                            validate={validateFunc}
                        >
                            {(fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{l10n.t('{0} is required', field.name)}</ErrorMessage>;
                                }
                                return (
                                    <div>
                                        <input
                                            {...fieldArgs.fieldProps}
                                            onChange={FieldValidators.chain(
                                                fieldArgs.fieldProps.onChange,
                                                (val: any) => {
                                                    const subField = {
                                                        ...field,
                                                        ...{ key: `${field.key}.originalEstimate` },
                                                    };
                                                    this.handleInlineInputEdit(subField, val);
                                                },
                                            )}
                                            className="ac-inputField"
                                        />
                                        <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                        {errDiv}
                                    </div>
                                );
                            }}
                        </Field>
                        <div className="ac-inline-flex-hpad"></div>
                        <Field
                            label={l10n.t('Remaining estimate')}
                            isRequired={field.required}
                            id={`${field.key}.remainingEstimate`}
                            name={`${field.key}.remainingEstimate`}
                            validate={validateFunc}
                        >
                            {(fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                }
                                return (
                                    <div>
                                        <input
                                            {...fieldArgs.fieldProps}
                                            onChange={FieldValidators.chain(
                                                fieldArgs.fieldProps.onChange,
                                                (val: any) => {
                                                    const subField = {
                                                        ...field,
                                                        ...{ key: `${field.key}.remainingEstimate` },
                                                    };
                                                    this.handleInlineInputEdit(subField, val);
                                                },
                                            )}
                                            className="ac-inputField"
                                        />
                                        <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                        {errDiv}
                                    </div>
                                );
                            }}
                        </Field>
                    </div>
                );
            }
            case UIType.Worklog: {
                if (editmode) {
                    return <div>{l10n.t("don't call getInputMarkup for worklog in editmode")}</div>;
                }
                let validateFunc = FieldValidators.validateString;
                return (
                    <React.Fragment>
                        <div style={{ display: field.required ? 'none' : 'block' }}>
                            <Field id={`${field.key}.enabled`} name={`${field.key}.enabled`}>
                                {(fieldArgs: any) => (
                                    <Checkbox
                                        {...fieldArgs.fieldProps}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (e: any) => {
                                            const subField = {
                                                ...field,
                                                ...{ key: `${field.key}.enabled` },
                                            };
                                            this.handleInlineEdit(subField, e.target.checked);
                                        })}
                                        label={l10n.t('Log work')}
                                    />
                                )}
                            </Field>
                        </div>
                        {this.state.fieldValues[field.key] && this.state.fieldValues[field.key].enabled && (
                            <React.Fragment>
                                <div className="ac-flex">
                                    <Field
                                        label={l10n.t('Worklog time spent')}
                                        isRequired={true}
                                        id={`${field.key}.timeSpent`}
                                        name={`${field.key}.timeSpent`}
                                        validate={validateFunc}
                                    >
                                        {(fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = (
                                                    <ErrorMessage>{l10n.t('Time spent is required')}</ErrorMessage>
                                                );
                                            }
                                            return (
                                                <div>
                                                    <input
                                                        {...fieldArgs.fieldProps}
                                                        onChange={FieldValidators.chain(
                                                            fieldArgs.fieldProps.onChange,
                                                            (val: any) => {
                                                                const subField = {
                                                                    ...field,
                                                                    ...{ key: `${field.key}.timeSpent` },
                                                                };
                                                                this.handleInlineInputEdit(subField, val);
                                                            },
                                                        )}
                                                        className="ac-inputField"
                                                    />
                                                    <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                    {errDiv}
                                                </div>
                                            );
                                        }}
                                    </Field>
                                    <div className="ac-inline-flex-hpad"></div>
                                    <Field
                                        label={l10n.t('Remaining estimate')}
                                        isRequired={true}
                                        id={`${field.key}.newEstimate`}
                                        name={`${field.key}.newEstimate`}
                                        validate={validateFunc}
                                    >
                                        {(fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = (
                                                    <ErrorMessage>
                                                        {l10n.t('Remaining estimate is required')}
                                                    </ErrorMessage>
                                                );
                                            }
                                            return (
                                                <div>
                                                    <input
                                                        {...fieldArgs.fieldProps}
                                                        onChange={FieldValidators.chain(
                                                            fieldArgs.fieldProps.onChange,
                                                            (val: any) => {
                                                                const subField = {
                                                                    ...field,
                                                                    ...{ key: `${field.key}.newEstimate` },
                                                                };
                                                                this.handleInlineInputEdit(subField, val);
                                                            },
                                                        )}
                                                        className="ac-inputField"
                                                    />
                                                    <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                    {errDiv}
                                                </div>
                                            );
                                        }}
                                    </Field>
                                </div>
                                <Field
                                    label={l10n.t('Worklog start time')}
                                    isRequired={true}
                                    id={`${field.key}.started`}
                                    name={`${field.key}.started`}
                                    validate={validateFunc}
                                >
                                    {(fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{l10n.t('Start time is required')}</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <DateTimePicker
                                                    {...fieldArgs.fieldProps}
                                                    className="ac-select-container"
                                                    timeIsEditable
                                                    datePickerSelectProps={{
                                                        className: 'ac-select-container',
                                                        classNamePrefix: 'ac-select',
                                                    }}
                                                    timePickerSelectProps={{
                                                        className: 'ac-select-container',
                                                        classNamePrefix: 'ac-select',
                                                    }}
                                                    onChange={FieldValidators.chain(
                                                        fieldArgs.fieldProps.onChange,
                                                        (val: any) => {
                                                            const subField = {
                                                                ...field,
                                                                ...{ key: `${field.key}.started` },
                                                            };
                                                            this.handleInlineEdit(subField, val);
                                                        },
                                                    )}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }}
                                </Field>
                                <Field
                                    label={l10n.t('Worklog comment')}
                                    isRequired={false}
                                    id={`${field.key}.comment`}
                                    name={`${field.key}.comment`}
                                >
                                    {(fieldArgs: any) => {
                                        return (
                                            <textarea
                                                {...fieldArgs.fieldProps}
                                                style={{ width: '100%', display: 'block' }}
                                                className="ac-textarea"
                                                rows={5}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (val: any) => {
                                                        const subField = {
                                                            ...field,
                                                            ...{ key: `${field.key}.comment` },
                                                        };
                                                        this.handleInlineInputEdit(subField, val);
                                                    },
                                                )}
                                            />
                                        );
                                    }}
                                </Field>
                            </React.Fragment>
                        )}
                    </React.Fragment>
                );
            }
            case UIType.Participants: {
                return <ParticipantList users={this.state.fieldValues[field.key]} />;
            }
            case UIType.NonEditable: {
                return this.getNonEditableMarkup(field.valueType, this.state.fieldValues[field.key]);
            }
            case UIType.Attachment: {
                if (editmode) {
                    return <div />;
                }

                return (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{field.name}</label>
                        <AttachmentForm
                            isInline={true}
                            field={field}
                            onFilesChanged={this.handleCreateModeAttachments}
                        />
                    </div>
                );
            }
        }

        // catch-all for unknown field types
        let validateFunc = field.required ? FieldValidators.validateString : undefined;

        if (editmode) {
            return (
                <div style={{ color: 'red' }}>
                    Unknown field type - {field.key} : {field.uiType}
                </div>
            );
        }
        return (
            <Field
                label={field.name}
                isRequired={field.required}
                id={field.key}
                name={field.key}
                validate={validateFunc}
            >
                {(fieldArgs: any) => {
                    let errDiv = <span />;
                    if (fieldArgs.error === 'EMPTY') {
                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                    }
                    return (
                        <div>
                            <div style={{ color: 'red' }}>
                                Unknown field type - {field.key} : {field.uiType}
                            </div>
                            <input
                                {...fieldArgs.fieldProps}
                                style={{ width: '100%', display: 'block' }}
                                className="ac-inputField"
                            />
                            {errDiv}
                        </div>
                    );
                }}
            </Field>
        );
    }

    private getNonEditableMarkup(valueType: ValueType, value: any): JSX.Element {
        switch (valueType) {
            case ValueType.Url:
            case ValueType.Number:
            case ValueType.String: {
                return (
                    <div className="ac-vpadding">
                        <div className="ac-">{value}</div>
                    </div>
                );
            }

            case ValueType.DateTime:
            case ValueType.Date: {
                return (
                    <div className="ac-vpadding">
                        <div>${formatDistanceToNow(value)} ago`</div>
                    </div>
                );
            }

            case ValueType.Option: {
                return (
                    <div className="ac-vpadding">
                        <div>{value.value}</div>
                    </div>
                );
            }

            case ValueType.IssueType:
            case ValueType.Priority: {
                return (
                    <div className="ac-vpadding">
                        <div className="ac-flex">
                            <img src={value.iconUrl} width="24" height="24" />
                            <span style={{ marginLeft: '10px' }}>{value.name}</span>
                        </div>
                    </div>
                );
            }
            case ValueType.Status: {
                const lozColor: string = colorToLozengeAppearanceMap[value.statusCategory.colorName];
                return (
                    <div className="ac-vpadding">
                        <Lozenge appearance={lozColor}>{value.name}</Lozenge>
                    </div>
                );
            }
            case ValueType.Transition: {
                const lozColor: string = colorToLozengeAppearanceMap[value.to.statusCategory.colorName];
                return (
                    <div className="ac-vpadding">
                        <Lozenge appearance={lozColor}>{value.name}</Lozenge>
                    </div>
                );
            }
            case ValueType.User:
            case ValueType.Project: {
                const label: string = value.displayName ? value.displayName : value.name;
                const avatar = value.avatarUrls && value.avatarUrls['24x24'] ? value.avatarUrls['24x24'] : '';
                return (
                    <div className="ac-vpadding">
                        <div className="ac-flex">
                            <Avatar
                                size="medium"
                                borderColor="var(--vscode-dropdown-foreground)!important"
                                src={avatar}
                            />
                            <span style={{ marginLeft: '4px' }}>{label}</span>
                        </div>
                    </div>
                );
            }

            case ValueType.Attachment:
            case ValueType.Worklog:
            case ValueType.IssueLinks:
            case ValueType.CommentsPage:
            case ValueType.Timetracking: {
                return <React.Fragment></React.Fragment>;
            }

            case ValueType.Group:
            case ValueType.Component:
            case ValueType.Version: {
                if (Array.isArray(value)) {
                    const names = value.map((val) => val.name);
                    return (
                        <div className="ac-vpadding">
                            <div>{names}</div>
                        </div>
                    );
                } else {
                    return (
                        <div className="ac-vpadding">
                            <div>{value.name}</div>
                        </div>
                    );
                }
            }
        }

        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        return <div>{value}</div>;
    }

    private getValidateFunction(field: FieldUI, editmode: boolean = false): FuncOrUndefined {
        let valType = field.valueType;
        let valfunc = undefined;

        switch (valType) {
            case ValueType.Number: {
                if (editmode) {
                    valfunc = field.required ? FieldValidators.isValidRequiredNumber : FieldValidators.isValidNumber;
                } else {
                    valfunc = field.required ? FieldValidators.validateRequiredNumber : FieldValidators.validateNumber;
                }
                break;
            }
            case ValueType.Url: {
                if (editmode) {
                    valfunc = field.required ? FieldValidators.isValidRequiredUrl : FieldValidators.isValidUrl;
                } else {
                    valfunc = field.required ? FieldValidators.validateRequiredUrl : FieldValidators.validateUrl;
                }
                break;
            }

            default: {
                if (field.required) {
                    valfunc = editmode ? FieldValidators.isValidString : FieldValidators.validateString;
                }
                break;
            }
        }

        return valfunc;
    }

    private inlineEditTypeForValueType(vt: ValueType): EdiTextType {
        switch (vt) {
            case ValueType.Url:
                return 'url';
            case ValueType.Number:
                return 'number';
            default:
                return 'text';
        }
    }
}
