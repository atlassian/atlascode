import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker, DateTimePicker } from '@atlaskit/datetime-picker';
import { CheckboxField, ErrorMessage, Field, Fieldset, HelperMessage } from '@atlaskit/form';
import Lozenge from '@atlaskit/lozenge';
import { MentionNameStatus } from '@atlaskit/mention';
import { RadioGroup } from '@atlaskit/radio';
import Select, { AsyncCreatableSelect, AsyncSelect, CreatableSelect } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import {
    CommentVisibility,
    emptyIssueType,
    IssuePickerIssue,
    IssueType,
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
import { Tooltip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import debounce from 'lodash.debounce';
import React from 'react';
import EdiText, { EdiTextType } from 'react-editext';
import { v4 } from 'uuid';

import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { ProjectsPagination } from '../../../constants';
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
import { CommonMessageType } from '../../../lib/ipc/toUI/common';
import { Features } from '../../../util/features';
import { RovoDevEntitlementType } from '../../../util/rovo-dev-entitlement/rovoDevEntitlementChecker';
import { ConnectionTimeout } from '../../../util/time';
import AISuggestionFooter from '../aiCreateIssue/AISuggestionFooter';
import AISuggestionHeader from '../aiCreateIssue/AISuggestionHeader';
import { colorToLozengeAppearanceMap } from '../colors';
import * as FieldValidators from '../fieldValidators';
import { chain } from '../fieldValidators';
import * as SelectFieldHelper from '../selectFieldHelper';
import { WebviewComponent } from '../WebviewComponent';
import { AttachmentForm } from './AttachmentForm';
import CascadingSelectField, { CascadingSelectOption } from './CascadingSelectField';
import { convertAdfToWikimarkup } from './common/adfToWikimarkup';
import { AtlascodeMentionProvider } from './common/AtlaskitEditor/AtlascodeMentionsProvider';
import AtlaskitEditor from './common/AtlaskitEditor/AtlaskitEditor';
import JiraIssueTextAreaEditor from './common/JiraIssueTextArea';
import { EditRenderedTextArea } from './EditRenderedTextArea';
import InlineIssueLinksEditor from './InlineIssueLinkEditor';
import InlineSubtaskEditor from './InlineSubtaskEditor';
import { LazyLoadingSelect } from './LazyLoadingSelect';
import { ParticipantList } from './ParticipantList';
import { TextAreaEditor } from './TextAreaEditor';

export type MentionInfo = {
    displayName: string;
    avatarUrl: string;
    mention: string;
    accountId: string;
};

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
    errorDetails: string | { message?: string; title?: string } | undefined;
    commentInputValue: string;
    isRovoDevEnabled: boolean;
    isGeneratingSuggestions?: boolean;
    summaryKey: string;
    isAtlaskitEditorEnabled: boolean;
    showRovoDevPromoBanner: boolean;
    rovoDevEntitlementType?: RovoDevEntitlementType;
    rovoDevPromoBannerDismissed: boolean;
    lastFailedAction?: CommonEditorPageEmit;
    projectPagination?: {
        total: number;
        loaded: number;
        hasMore: boolean;
        isLoadingMore: boolean;
    };
    isLoggedOut: boolean;
    loggedOutSiteName?: string;
    showEditorMissedScopeBanner: boolean;
    showAtlaskitEditor: boolean;
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
    isRovoDevEnabled: false,
    summaryKey: v4(),
    isAtlaskitEditorEnabled: false,
    showRovoDevPromoBanner: false,
    rovoDevEntitlementType: undefined,
    rovoDevPromoBannerDismissed: false,
    isLoggedOut: false,
    loggedOutSiteName: undefined,
    showEditorMissedScopeBanner: false,
    showAtlaskitEditor: false,
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

    protected abstract fetchAndTransformUsers: (input: string, accountId?: string) => Promise<MentionInfo[]>;

    protected abstract getApiVersion(): string;

    protected getMentionProvider() {
        return AtlascodeMentionProvider.init(
            {
                url: '',
                mentionNameResolver: {
                    lookupName: async (id: string) => {
                        const accountId = id.split('accountid:')[1];
                        if (!accountId) {
                            return {
                                id,
                                name: 'Unknown User',
                                status: MentionNameStatus.UNKNOWN,
                            };
                        }

                        const users = await this.fetchAndTransformUsers('', accountId);
                        if (users.length === 0) {
                            return {
                                id,
                                name: 'Unknown User',
                                status: MentionNameStatus.UNKNOWN,
                            };
                        }
                        const resolvedMention = {
                            id,
                            name: users[0].displayName,
                            status: MentionNameStatus.OK,
                        };
                        return resolvedMention;
                    },
                    cacheName: (_id: string, _name: string) => {
                        // currently this method is never called by Atlaskit. So it is implemented only to satisfy the interface
                    },
                },
            },
            this.fetchAndTransformUsers,
        );
    }

    protected fetchUsers = (input: string, accountId?: string) => {
        const apiVersion = this.getApiVersion();
        let userSearchUrl;
        if (accountId) {
            userSearchUrl = `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?accountId=${accountId}`;
        } else {
            userSearchUrl = this.state.siteDetails.isCloud
                ? `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?query=`
                : `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?username=`;
        }
        return this.loadSelectOptions(input, userSearchUrl);
    };

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

    private coerceToString(value: any): string {
        if (value === undefined || value === null) {
            return '';
        }
        const t = typeof value;
        if (t === 'string') {
            return value as string;
        }
        if (t === 'number' || t === 'boolean') {
            return String(value);
        }
        // Check if it's an ADF object
        if (t === 'object' && value.type === 'doc' && value.version === 1) {
            // This method always returns a string (used by string-only controls: Textfield, DatePicker, legacy text area).
            // Atlaskit path: serialize ADF to JSON string so we have a reversible string form; the editor itself receives the raw object via fieldValues.
            if (this.state.showAtlaskitEditor) {
                return JSON.stringify(value);
            }
            // For legacy editor, convert ADF to WikiMarkup
            // Note: This will gracefully fall back to plain text if conversion fails
            return convertAdfToWikimarkup(value);
        }
        // For any other type (objects, symbols, functions), render empty string
        return '';
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
            case 'updateFeatureFlags': {
                this.setState({
                    isAtlaskitEditorEnabled: e.featureFlags[Features.AtlaskitEditor] || false,
                });
                break;
            }
            case 'loadingStart': {
                this.setState({ isSomethingLoading: true, loadingField: e.loadingField });
                break;
            }
            case 'loadingEnd': {
                this.setState({ isSomethingLoading: false, loadingField: '' });
                break;
            }
            case 'additionalSettings': {
                this.setState({ isRovoDevEnabled: e.settings.rovoDevEnabled });
                break;
            }
            case CommonMessageType.RovoDevEntitlementBanner: {
                handled = true;
                this.setState({
                    showRovoDevPromoBanner: e.enabled || false,
                    rovoDevEntitlementType: e.enabled ? (e.entitlementType as RovoDevEntitlementType) : undefined,
                });
                break;
            }
            case 'loggedOut': {
                handled = true;
                this.setState({
                    isLoggedOut: true,
                    loggedOutSiteName: e.siteName,
                    isSomethingLoading: false,
                    loadingField: '',
                    isErrorBannerOpen: true,
                    errorDetails: {
                        title: 'Session Expired',
                        message: 'You have been logged out. Please close this tab and log in again to continue editing',
                    },
                });
                break;
            }
            case 'scopeCheckResult': {
                if (e.checkedScopes?.mediaRead !== undefined && e.checkedScopes?.mediaWrite !== undefined) {
                    const showEditorMissedScopeBanner =
                        this.state.isAtlaskitEditorEnabled &&
                        !e.isApiToken &&
                        !e.checkedScopes.mediaRead &&
                        !e.checkedScopes.mediaWrite;
                    const showAtlaskitEditor =
                        this.state.isAtlaskitEditorEnabled && !e.isApiToken && e.checkedScopes.mediaRead;
                    this.setState({
                        showEditorMissedScopeBanner,
                        showAtlaskitEditor,
                    });
                }
                break;
            }
        }

        return handled;
    }

    override postMessage<T extends CommonEditorPageEmit>(e: T) {
        this._api.postMessage(e);
    }

    protected isClearableSelect = (field: SelectFieldUI): boolean => {
        // AXON-298 Never allow clearing priority field
        if (field.key === 'priority') {
            return false;
        }

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
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined, lastFailedAction: undefined });
    };

    protected handleRetryLastAction = () => {
        if (this.state.lastFailedAction) {
            this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
            this.postMessage(this.state.lastFailedAction);
        }
    };

    protected handleSignIn = () => {
        this.postMessage({ action: 'openJiraAuth' });
    };

    protected handleOpenIssue = (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => {
        let issueObj = issueOrKey;

        if (typeof issueOrKey === 'string') {
            issueObj = { key: issueOrKey, siteDetails: this.state.siteDetails };
        }

        const nonce: string = v4();
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

    protected loadIssueOptions = (
        field: SelectFieldUI,
        input: string,
        currentJQL?: string,
    ): Promise<IssuePickerIssue[]> => {
        return new Promise((resolve) => {
            const nonce: string = v4();
            (async () => {
                try {
                    const listEvent = await this.postMessageWithEventPromise(
                        {
                            action: 'fetchIssues',
                            query: input,
                            site: this.state.siteDetails,
                            autocompleteUrl: field.autoCompleteUrl,
                            nonce: nonce,
                            currentJQL: currentJQL,
                        },
                        'issueSuggestionsList',
                        ConnectionTimeout,
                        nonce,
                    );
                    resolve((listEvent as IssueSuggestionsList).issues);
                } catch {
                    resolve([]);
                }
            })();
        });
    };

    protected fixAutocompleteUrl(field: SelectFieldUI): string {
        let url = field.autoCompleteUrl;

        /**
         * AXON-49 This is a workaround for the suggested autocomplete URL
         * (.../user/recommend/...) not being accessible
         */
        if (url.includes('user/recommend')) {
            url = url.replace('user/recommend', 'user/search') + '&query=';
        }

        /**
         * AXON-75 This is a workaround for the epic link field autocomplete URL
         * for a case when epic field is renamed
         */
        if (field.schema.endsWith('epic-link')) {
            url = url.split('?')[0] + '?fieldName=Epic Link&fieldValue=';
        }

        return url;
    }

    protected loadSelectOptionsForField = (field: SelectFieldUI, input: string): Promise<any[]> => {
        this.setState({ isSomethingLoading: true, loadingField: field.key });

        if (field.valueType === ValueType.User) {
            const apiVersion = this.getApiVersion();
            const userSearchUrl = this.state.siteDetails.isCloud
                ? `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?query=`
                : `${this.state.siteDetails.baseApiUrl}/api/${apiVersion}/user/search?username=`;
            return this.loadSelectOptions(input, userSearchUrl);
        }

        return this.loadSelectOptions(input, this.fixAutocompleteUrl(field), field);
    };

    protected loadSelectOptions = (input: string, url: string, field?: SelectFieldUI): Promise<any[]> => {
        this.setState({ isSomethingLoading: true });
        return new Promise((resolve) => {
            const nonce: string = v4();
            (async () => {
                try {
                    const listEvent = await this.postMessageWithEventPromise(
                        {
                            action: 'fetchSelectOptions',
                            query: input,
                            site: this.state.siteDetails,
                            autocompleteUrl: url,
                            fieldName: field?.name,
                            fieldKey: field?.key,
                            nonce,
                        },
                        'selectOptionsList',
                        ConnectionTimeout,
                        nonce,
                    );

                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(listEvent.options || []);
                } catch {
                    this.setState({ isSomethingLoading: false, loadingField: '' });
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
            const nonce: string = v4();

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
                } catch {
                    this.setState({ isSomethingLoading: false });
                }
            })();
        }
    }, 100);

    handleEditorFocus = (isFocused: boolean) => {
        this.postMessage({
            action: 'handleEditorFocus',
            isFocused,
        });
    };

    protected getInputMarkup(
        field: FieldUI,
        editmode: boolean = false,
        currentIssueType: IssueType = emptyIssueType,
    ): any {
        switch (field.uiType) {
            case UIType.Input: {
                const validateFunc = this.getValidateFunction(field, editmode);
                let validationFailMessage = '';
                const valType = field.valueType;

                const defaultVal = this.coerceToString(this.state.fieldValues[field.key]);
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
                                fetchUsers={this.fetchAndTransformUsers}
                                onSave={async (val: string) => {
                                    await this.handleInlineEdit(field, val);
                                }}
                                fetchImage={(img) => this.fetchImage(img)}
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
                    <>
                        {field.key === 'summary' && <AISuggestionHeader vscodeApi={this._api} />}
                        <Field
                            key={field.key === 'summary' ? this.state.summaryKey : field.key}
                            defaultValue={defaultVal}
                            label={<span>{field.name}</span>}
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
                                    <Textfield
                                        {...fieldArgs.fieldProps}
                                        className="ac-inputField"
                                        isDisabled={
                                            (this.state.isSomethingLoading && this.state.loadingField === field.key) ||
                                            this.state.isGeneratingSuggestions
                                        }
                                        onChange={chain(fieldArgs.fieldProps.onChange, (e: any) =>
                                            this.handleInlineEdit(field, e.currentTarget.value),
                                        )}
                                        placeholder={field.key === 'summary' && 'What needs to be done?'}
                                    />
                                );
                                if ((field as InputFieldUI).isMultiline) {
                                    markup = this.state.showAtlaskitEditor ? (
                                        <AtlaskitEditor
                                            defaultValue={this.state.fieldValues[field.key] || ''}
                                            isSaveOnBlur={true}
                                            onBlur={() => this.handleEditorFocus(false)}
                                            onFocus={() => this.handleEditorFocus(true)}
                                            onSave={(content) => this.handleInlineEdit(field, content)}
                                            mentionProvider={Promise.resolve(this.getMentionProvider())}
                                        />
                                    ) : (
                                        <JiraIssueTextAreaEditor
                                            {...fieldArgs.fieldProps}
                                            value={this.coerceToString(this.state.fieldValues[field.key])}
                                            isDisabled={
                                                (this.state.isSomethingLoading &&
                                                    this.state.loadingField === field.key) ||
                                                this.state.isGeneratingSuggestions
                                            }
                                            onChange={chain(fieldArgs.fieldProps.onChange, (val: string) =>
                                                this.handleInlineEdit(field, val),
                                            )}
                                            fetchUsers={this.fetchAndTransformUsers}
                                            onEditorFocus={() => this.handleEditorFocus(true)}
                                            onEditorBlur={() => this.handleEditorFocus(false)}
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
                        {field.key === 'description' && <AISuggestionFooter vscodeApi={this._api} />}
                    </>
                );
            }
            case UIType.Date: {
                let markup = <div></div>;
                const validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = (
                        <DatePicker
                            id={field.key}
                            name={field.key}
                            isLoading={this.state.loadingField === field.key}
                            defaultValue={this.coerceToString(this.state.fieldValues[field.key])}
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
                        label={<span>{field.name}</span>}
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
                                        defaultValue={this.coerceToString(this.state.fieldValues[field.key])}
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
                const validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = (
                        <DateTimePicker
                            id={field.key}
                            name={field.key}
                            defaultValue={this.coerceToString(this.state.fieldValues[field.key])}
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
                        label={<span>{field.name}</span>}
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
                                    <DateTimePicker
                                        {...fieldArgs.fieldProps}
                                        defaultValue={this.coerceToString(this.state.fieldValues[field.key])}
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
                // seems unused, but keeping it for now. No calls of getInputMarkup for uiType === 'subtasks'
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
            case UIType.IssueLink: {
                if (editmode && currentIssueType.name !== 'Epic') {
                    let defaultParent: IssuePickerIssue | undefined;
                    if (this.state.fieldValues['parent']) {
                        defaultParent = {
                            img: this.state.fieldValues['parent'].issuetype?.iconUrl || '',
                            key: this.state.fieldValues['parent'].key,
                            keyHtml: `<b>${this.state.fieldValues['parent'].key}</b>`,
                            summary: this.state.fieldValues['parent'].summary,
                            summaryText: this.state.fieldValues['parent'].summary,
                        };
                    } else {
                        defaultParent = undefined;
                    }
                    const sameProjectQuery = `project = "${this.state.fieldValues['project'].key}"`;
                    let jqlQuery: string = '';
                    if (currentIssueType.subtask) {
                        jqlQuery = `${sameProjectQuery} AND issuetype in standardIssueTypes())`;
                    } else {
                        jqlQuery = `${sameProjectQuery} AND issuetype = Epic`;
                    }

                    if (this.state.siteDetails.isCloud) {
                        return (
                            <AsyncSelect
                                isClearable={!field.required && !currentIssueType.subtask}
                                isMulti={false}
                                defaultValue={defaultParent}
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                loadOptions={async (input: string) =>
                                    await this.loadIssueOptions(field as SelectFieldUI, input, jqlQuery)
                                }
                                getOptionLabel={(option: any) => option.key}
                                getOptionValue={(option: any) => option.key}
                                placeholder="Search for parent issue"
                                isLoading={this.state.loadingField === field.key}
                                isDisabled={this.state.isSomethingLoading}
                                onChange={(val: any) => {
                                    this.handleSelectChange(field as SelectFieldUI, val);
                                }}
                                components={{
                                    Option: SelectFieldHelper.IssueSuggestionOption,
                                    SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                }}
                            />
                        );
                    } else {
                        return (
                            <Tooltip title="Can only configure in Jira Web">
                                <div style={{ display: 'inline-block', width: '100%' }}>
                                    <AsyncSelect
                                        isClearable={!field.required && !currentIssueType.subtask}
                                        isMulti={false}
                                        defaultValue={defaultParent}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        getOptionLabel={(option: any) => option.key}
                                        getOptionValue={(option: any) => option.key}
                                        placeholder="Can only configure in Jira Web"
                                        isLoading={this.state.loadingField === field.key}
                                        isDisabled={true}
                                        components={{
                                            Option: SelectFieldHelper.IssueSuggestionOption,
                                            SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                        }}
                                    />
                                </div>
                            </Tooltip>
                        );
                    }
                } else if (currentIssueType.name !== 'Epic') {
                    // This will never run for DC because it does not have 'parent' field
                    const defaultParent = this.state.fieldValues['parent'] || undefined;

                    return (
                        <Field
                            label={<span>{field.name}</span>}
                            isRequired={field.required}
                            id={field.key}
                            name={field.key}
                        >
                            {(fieldArgs: any) => {
                                return (
                                    <AsyncSelect
                                        {...fieldArgs.fieldProps}
                                        defaultValue={defaultParent}
                                        isClearable={!field.required}
                                        isMulti={false}
                                        className="ac-form-select-container"
                                        classNamePrefix="ac-form-select"
                                        loadOptions={async (input: string) =>
                                            await this.loadIssueOptions(
                                                field as SelectFieldUI,
                                                input,
                                                'issuetype = Epic',
                                            )
                                        }
                                        getOptionLabel={(option: any) => option.key}
                                        getOptionValue={(option: any) => option.key}
                                        placeholder="Search for parent issue"
                                        isLoading={this.state.loadingField === field.key}
                                        isDisabled={this.state.isSomethingLoading}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (val: any) => {
                                            this.handleInlineEdit(field, val);
                                        })}
                                        components={{
                                            Option: SelectFieldHelper.IssueSuggestionOption,
                                            SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                        }}
                                    />
                                );
                            }}
                        </Field>
                    );
                } else {
                    return <React.Fragment />;
                }
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
                            onFetchIssues={async (input: string) =>
                                await this.loadIssueOptions(field as SelectFieldUI, input)
                            }
                        />
                    );
                } else {
                    const validateFunc = field.required ? FieldValidators.validateSingleSelect : undefined;
                    const defaultLinkType = this.state.fieldValues[field.key]?.type || undefined;

                    return (
                        <React.Fragment>
                            <Field
                                label={<span>{field.name}</span>}
                                isRequired={field.required}
                                id={`${field.key}.type`}
                                name={`${field.key}.type`}
                                validate={validateFunc}
                            >
                                {(fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                    }

                                    return (
                                        <div>
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                key={`${field.key}.type-${defaultLinkType?.id || 'empty'}`}
                                                defaultValue={defaultLinkType}
                                                isMulti={false}
                                                isClearable={!field.required}
                                                className="ac-form-select-container"
                                                classNamePrefix="ac-form-select"
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
                                    const defaultLinkedIssues = this.state.fieldValues[field.key]?.issue || undefined;
                                    const linkedIssuesKey = `${field.key}.issue-${JSON.stringify(defaultLinkedIssues || [])}`;

                                    return (
                                        <AsyncSelect
                                            {...fieldArgs.fieldProps}
                                            key={linkedIssuesKey}
                                            defaultValue={defaultLinkedIssues}
                                            isClearable={true}
                                            isMulti={true}
                                            className="ac-form-select-container"
                                            classNamePrefix="ac-form-select"
                                            loadOptions={async (input: string) =>
                                                await this.loadIssueOptions(field as SelectFieldUI, input)
                                            }
                                            getOptionLabel={(option: any) => option.key}
                                            getOptionValue={(option: any) => option.key}
                                            placeholder="Search for an issue"
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
                            fetchUsers={this.fetchAndTransformUsers}
                            placeholder="Add a comment..."
                            disabled={false}
                            onChange={(input: string) => this.setState({ commentInputValue: input })}
                        />

                        <ButtonGroup>
                            <Button
                                className="ac-button"
                                onClick={this.handleExternalCommentSave}
                                isDisabled={this.state.commentInputValue === '' || this.state.isSomethingLoading}
                            >
                                {isServiceDeskProject ? 'Reply to customer' : 'Save'}
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
            case UIType.Cascading:
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
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                    onMenuClose={() => {
                                        if (this.state.loadingField === field.key) {
                                            this.setState({ isSomethingLoading: false, loadingField: '' });
                                        }
                                    }}
                                />
                            );
                        }

                        // create mode
                        return (
                            <Field
                                label={<span>{field.name}</span>}
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
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                value={defVal}
                                                className="ac-form-select-container"
                                                classNamePrefix="ac-form-select"
                                                isClearable={this.isClearableSelect(selectField)}
                                                options={this.state.selectFieldOptions[field.key]}
                                                isDisabled={this.state.isSomethingLoading}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                                onMenuClose={() => {
                                                    if (this.state.loadingField === field.key) {
                                                        this.setState({ isSomethingLoading: false, loadingField: '' });
                                                    }
                                                }}
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
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    placeholder="Type to create new option"
                                    createOptionPosition="first"
                                    value={this.state.fieldValues[field.key]}
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    noOptionsMessage={(input: any) => 'Type to create new option'}
                                    onCreateOption={(input: any): void => {
                                        this.handleSelectOptionCreate(selectField, input);
                                    }}
                                    onChange={(selected: any) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                    onMenuClose={() => {
                                        if (this.state.loadingField === field.key) {
                                            this.setState({ isSomethingLoading: false, loadingField: '' });
                                        }
                                    }}
                                />
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={<span>{field.name}</span>}
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
                                            <CreatableSelect
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                value={defVal}
                                                className="ac-form-select-container"
                                                classNamePrefix="ac-form-select"
                                                placeholder="Type to create new option"
                                                createOptionPosition="first"
                                                noOptionsMessage={(input: any) => 'Type to create new option'}
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
                                                onMenuClose={() => {
                                                    if (this.state.loadingField === field.key) {
                                                        this.setState({ isSomethingLoading: false, loadingField: '' });
                                                    }
                                                }}
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
                                    placeholder="Type to search"
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    noOptionsMessage={(input: any) => 'Type to search'}
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
                                    onMenuClose={() => {
                                        if (this.state.loadingField === field.key) {
                                            this.setState({ isSomethingLoading: false, loadingField: '' });
                                        }
                                    }}
                                />
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={<span>{field.name}</span>}
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
                                    if (field.valueType === ValueType.Project) {
                                        return (
                                            <React.Fragment>
                                                <LazyLoadingSelect
                                                    {...fieldArgs.fieldProps}
                                                    {...commonProps}
                                                    value={defVal}
                                                    className="ac-form-select-container"
                                                    classNamePrefix="ac-form-select"
                                                    placeholder="Type to search"
                                                    noOptionsMessage={() => 'Type to search'}
                                                    isClearable={this.isClearableSelect(selectField)}
                                                    options={this.state.selectFieldOptions[field.key]}
                                                    isDisabled={
                                                        this.state.isSomethingLoading &&
                                                        this.state.loadingField !== field.key
                                                    }
                                                    isLoading={this.state.loadingField === field.key}
                                                    hasMore={this.state.projectPagination?.hasMore || false}
                                                    isLoadingMore={this.state.projectPagination?.isLoadingMore || false}
                                                    totalCount={this.state.projectPagination?.total || 0}
                                                    loadedCount={this.state.projectPagination?.loaded || 0}
                                                    onLoadMore={this.handleLoadMoreProjects}
                                                    loadOptions={async (input: any) =>
                                                        await this.loadSelectOptionsForField(
                                                            field as SelectFieldUI,
                                                            input,
                                                        )
                                                    }
                                                    onChange={FieldValidators.chain(
                                                        fieldArgs.fieldProps.onChange,
                                                        (selected: any) => {
                                                            this.handleSelectChange(selectField, selected);
                                                        },
                                                    )}
                                                    onMenuClose={() => {
                                                        if (this.state.loadingField === field.key) {
                                                            this.setState({
                                                                isSomethingLoading: false,
                                                                loadingField: '',
                                                            });
                                                        }
                                                    }}
                                                />
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <React.Fragment>
                                            <AsyncSelect
                                                {...fieldArgs.fieldProps}
                                                {...commonProps}
                                                value={defVal}
                                                className="ac-form-select-container"
                                                classNamePrefix="ac-form-select"
                                                placeholder="Type to search"
                                                noOptionsMessage={(input: any) => 'Type to search'}
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
                                                onMenuClose={() => {
                                                    if (this.state.loadingField === field.key) {
                                                        this.setState({ isSomethingLoading: false, loadingField: '' });
                                                    }
                                                }}
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
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    placeholder="Type to search"
                                    createOptionPosition="first"
                                    value={this.state.fieldValues[field.key]}
                                    noOptionsMessage={(input: any) => 'Type to search'}
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
                                    onMenuClose={() => {
                                        if (this.state.loadingField === field.key) {
                                            this.setState({ isSomethingLoading: false, loadingField: '' });
                                        }
                                    }}
                                ></AsyncCreatableSelect>
                            );
                        }

                        //create mode
                        return (
                            <Field
                                label={<span>{field.name}</span>}
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
                                                value={defVal}
                                                className="ac-form-select-container"
                                                classNamePrefix="ac-form-select"
                                                placeholder="Type to search"
                                                createOptionPosition="first"
                                                noOptionsMessage={(input: any) => 'Type to search'}
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
                                                onMenuClose={() => {
                                                    if (this.state.loadingField === field.key) {
                                                        this.setState({ isSomethingLoading: false, loadingField: '' });
                                                    }
                                                }}
                                            ></AsyncCreatableSelect>
                                            {errDiv}
                                        </React.Fragment>
                                    );
                                }}
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.Cascading: {
                        if (editmode) {
                            return (
                                <CascadingSelectField
                                    commonProps={commonProps}
                                    isClearable={false}
                                    parentSelectOptions={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    onSave={(selected: CascadingSelectOption) => {
                                        this.handleSelectChange(selectField, selected);
                                    }}
                                    isCreateMode={false}
                                    initialValue={commonProps.value}
                                />
                            );
                        }
                        // create mode
                        return (
                            <Field
                                label={<span>{field.name}</span>}
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
                                        <>
                                            <CascadingSelectField
                                                commonProps={commonProps}
                                                initialValue={defVal}
                                                isClearable={false}
                                                parentSelectOptions={this.state.selectFieldOptions[field.key]}
                                                isDisabled={this.state.isSomethingLoading}
                                                onSave={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (selected: any) => {
                                                        this.handleSelectChange(selectField, selected);
                                                    },
                                                )}
                                                isCreateMode={true}
                                            />
                                            {errDiv}
                                        </>
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

                const legend: React.ReactElement = (
                    <span style={{ color: 'var(--vscode-editor-foreground)!important' }}>{field.name}</span>
                );
                const checkboxItems: any[] = [];
                const checkField = field as OptionableFieldUI;

                // FIX: Multi-select checkbox handling - manage array of selected values instead of boolean
                const currentSelectedValues = this.state.fieldValues[field.key] || [];
                const selectedIds = Array.isArray(currentSelectedValues)
                    ? currentSelectedValues.map((val: any) => val.id || val)
                    : [];

                const handleCheckboxChange = (optionValue: any, isChecked: boolean) => {
                    const newSelectedValues = isChecked
                        ? selectedIds.includes(optionValue.id)
                            ? currentSelectedValues // Already selected, no change
                            : [...currentSelectedValues, optionValue] // Add to selection
                        : currentSelectedValues.filter((val: any) => (val.id || val) !== optionValue.id); // Remove from selection

                    this.handleInlineEdit(field, newSelectedValues);
                };

                const isRequired = currentSelectedValues.length === 0 && field.required;
                checkField.allowedValues.forEach((value) => {
                    const isChecked = selectedIds.includes(value.id);

                    checkboxItems.push(
                        <CheckboxField
                            key={`${field.key}-${value.id}`}
                            name={`${field.key}-${value.id}`}
                            id={`${field.key}-${value.id}`}
                            value={value.id}
                            isRequired={isRequired}
                        >
                            {(fieldArgs: any) => (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    isChecked={isChecked}
                                    onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (e: any) => {
                                        handleCheckboxChange(value, e.target.checked);
                                    })}
                                    label={value.value}
                                />
                            )}
                        </CheckboxField>,
                    );
                });

                return <Fieldset legend={legend}>{checkboxItems}</Fieldset>;
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

                const radioItems: any[] = [];
                const radioField = field as OptionableFieldUI;
                radioField.allowedValues.forEach((value) => {
                    radioItems.push({ name: field.key, label: value.value, value: value.id });
                });

                const validateFunc = field.required ? FieldValidators.validateMultiSelect : undefined;
                return (
                    <Field
                        label={<span>{field.name}</span>}
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
                const validateFunc = this.getValidateFunction(field, editmode);
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
                            label="Original estimate"
                            isRequired={field.required}
                            id={`${field.key}.originalEstimate`}
                            name={`${field.key}.originalEstimate`}
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
                            label="Remaining estimate"
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
                    return <div>don't call getInputMarkup for worklog in editmode</div>;
                }
                const validateFunc = FieldValidators.validateString;
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
                                        label="Log work"
                                    />
                                )}
                            </Field>
                        </div>
                        {this.state.fieldValues[field.key] && this.state.fieldValues[field.key].enabled && (
                            <React.Fragment>
                                <div className="ac-flex">
                                    <Field
                                        label="Worklog time spent"
                                        isRequired={true}
                                        id={`${field.key}.timeSpent`}
                                        name={`${field.key}.timeSpent`}
                                        validate={validateFunc}
                                    >
                                        {(fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = <ErrorMessage>Time spent is required</ErrorMessage>;
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
                                        label="Remaining estimate"
                                        isRequired={true}
                                        id={`${field.key}.newEstimate`}
                                        name={`${field.key}.newEstimate`}
                                        validate={validateFunc}
                                    >
                                        {(fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = <ErrorMessage>Remaining estimate is required</ErrorMessage>;
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
                                    label="Worklog start time"
                                    isRequired={true}
                                    id={`${field.key}.started`}
                                    name={`${field.key}.started`}
                                    validate={validateFunc}
                                >
                                    {(fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Start time is required</ErrorMessage>;
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
                                    label="Worklog comment"
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
                // seems unused, but keeping it for now
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
                            initialFiles={this.state.fieldValues[field.key]}
                        />
                    </div>
                );
            }
        }

        // catch-all for unknown field types
        const validateFunc = field.required ? FieldValidators.validateString : undefined;

        if (editmode) {
            return (
                <div style={{ color: 'red' }}>
                    Unknown field type - {field.key} : {field.uiType}
                </div>
            );
        }
        return (
            <Field
                label={<span>{field.name}</span>}
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
                            <img src={value.iconUrl} width="24" height="24" alt={value.name || 'Icon'} />
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
        const valType = field.valueType;
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

    protected handleLoadMoreProjects = (startAt: number) => {
        if (this.state.projectPagination) {
            this.setState({
                projectPagination: {
                    ...this.state.projectPagination,
                    isLoadingMore: true,
                },
            });
        }

        this.postMessage({
            action: 'loadMoreProjects',
            maxResults: ProjectsPagination.pageSize,
            startAt: startAt,
            nonce: v4(),
        });
    };
}
