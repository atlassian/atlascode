import './CreateWorkItem.css';

import Form, { Field } from '@atlaskit/form';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';
import Select from '@atlaskit/select';
import React from 'react';
import { ConnectionTimeout } from 'src/util/time';
import { LazyLoadingSelect } from 'src/webviews/components/issue/LazyLoadingSelect';
import {
    CreateWorkItemWebviewProviderMessage,
    CreateWorkItemWebviewProviderMessageType,
} from 'src/work-items/create-work-item/messages/createWorkItemWebviewProviderMessages';
import { v4 } from 'uuid';

import { useMessagingApi } from '../messagingApi';
import { CreateWorkItemWebviewResponse, CreateWorkItemWebviewResponseType } from './createWorkItemWebviewMessages';
import { CreateFormActionType, CreateFormState, createReducer } from './utils';

const emptyState: CreateFormState = {
    summary: '',
    availableSites: [],
    availableProjects: [],
    availableIssueTypes: [],
    selectedSiteId: undefined,
    selectedProjectId: undefined,
    selectedIssueTypeId: undefined,
    requiredFieldsForIssueType: [],
};

const CreateWorkItemWebview: React.FC = () => {
    const [state, dispatch] = React.useReducer(createReducer, emptyState);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [pendingMessage, setPendingMessage] = React.useState<CreateWorkItemWebviewResponse | null>(null);

    const defaultSite = React.useMemo(
        () =>
            state.selectedSiteId ? state.availableSites.find((site) => site.value === state.selectedSiteId) : undefined,
        [state.availableSites, state.selectedSiteId],
    );

    const defaultProject = React.useMemo(
        () =>
            state.selectedProjectId
                ? state.availableProjects.find((project) => project.value === state.selectedProjectId)
                : undefined,
        [state.availableProjects, state.selectedProjectId],
    );

    const defaultIssueType = React.useMemo(
        () =>
            state.selectedIssueTypeId
                ? state.availableIssueTypes.find((issueType) => issueType.value === state.selectedIssueTypeId)
                : undefined,
        [state.availableIssueTypes, state.selectedIssueTypeId],
    );

    const handleSubmit = React.useCallback(
        (onCompletion?: 'view' | 'generateCode' | 'startWork') => {
            const errors: Record<string, string> = {};
            if (!state.selectedIssueTypeId) {
                errors['issueType'] = 'EMPTY';
            }
            if (!state.selectedProjectId) {
                errors['project'] = 'EMPTY';
            }
            if (!state.selectedSiteId) {
                errors['site'] = 'EMPTY';
            }
            if (!state.summary || state.summary.trim().length === 0) {
                errors['summary'] = 'EMPTY';
            }
            if (Object.keys(errors).length > 0) {
                return errors;
            }

            setPendingMessage({
                type: CreateWorkItemWebviewResponseType.CreateWorkItem,
                payload: {
                    summary: state.summary,
                    onCompletion: onCompletion || 'view',
                },
            });

            return undefined;
        },
        [state.selectedIssueTypeId, state.selectedProjectId, state.selectedSiteId, state.summary],
    );

    const onMessageHandler = React.useCallback(
        (msg: CreateWorkItemWebviewProviderMessage) => {
            switch (msg.type) {
                case CreateWorkItemWebviewProviderMessageType.InitFields: {
                    dispatch(msg);
                    setIsLoading(false);
                    break;
                }
                case CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite:
                case CreateWorkItemWebviewProviderMessageType.UpdatedSelectedProject: {
                    dispatch(msg);
                    break;
                }

                case CreateWorkItemWebviewProviderMessageType.TriggerCreateWorkItem: {
                    const onCreateAction = msg.payload.onCreateAction;
                    handleSubmit(onCreateAction);
                    break;
                }
                default:
                    break;
            }
        },
        [handleSubmit],
    );

    const { postMessage, postMessagePromise } = useMessagingApi<
        CreateWorkItemWebviewResponse,
        CreateWorkItemWebviewProviderMessage,
        CreateWorkItemWebviewProviderMessage
    >(onMessageHandler);

    React.useEffect(() => {
        if (pendingMessage) {
            postMessage(pendingMessage);
            setPendingMessage(null);
        }
    }, [pendingMessage, postMessage]);

    const handleChangeField = React.useCallback(
        (newValue: any, type: 'site' | 'project' | 'issueType') => {
            if (newValue) {
                dispatch({
                    type: CreateFormActionType.SetSelectedField,
                    payload: {
                        fieldType: type,
                        id: newValue.value,
                    },
                });
                postMessage({
                    type: CreateWorkItemWebviewResponseType.UpdateField,
                    payload: {
                        feildType: type,
                        id: newValue.value,
                    },
                });
            }
        },
        [postMessage],
    );

    const constructSelectOptions = <T extends { id?: string; value?: string; name: string }>(items: T[]) => {
        return items.map((item) => ({
            value: item.value || item.id || '',
            label: item.name,
        }));
    };

    const handleLoadMoreProjects = React.useCallback(
        async (inputValue: any) => {
            if (typeof inputValue !== 'string') {
                inputValue = '';
            }
            const nonce = v4();
            const query: string = inputValue.trim();
            setIsLoading(true);
            const response = await postMessagePromise(
                {
                    type: CreateWorkItemWebviewResponseType.UpdateSelectOptions,
                    payload: {
                        fieldType: 'project',
                        query: query,
                        nonce: nonce,
                    },
                },
                CreateWorkItemWebviewProviderMessageType.UpdateProjectOptions,
                ConnectionTimeout,
                nonce,
            );
            setIsLoading(false);
            return constructSelectOptions(response.payload.availableProjects);
        },
        [postMessagePromise],
    );

    const handleUpdateSummary = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const summary = e.target.value;
        dispatch({
            type: CreateFormActionType.SetSummary,
            payload: {
                summary,
            },
        });
    }, []);

    const handleCancel = React.useCallback(() => {
        postMessage({ type: CreateWorkItemWebviewResponseType.Cancel });
    }, [postMessage]);

    React.useEffect(() => {
        postMessage({ type: CreateWorkItemWebviewResponseType.WebviewReady });
    }, [postMessage]);

    return (
        <div className="view-container">
            <Form id="create-work-item-form" name="create-work-item-form" onSubmit={handleSubmit}>
                {(frmArgs: any) => (
                    <form {...frmArgs.formProps} className="form-container">
                        <Field label={<span>Site</span>} name="site" isRequired>
                            {(fieldArgs: any) => (
                                <Select
                                    {...fieldArgs.fieldProps}
                                    className="ac-form-select-container"
                                    classNamePrefix="ac-form-select"
                                    onChange={(val: any) => handleChangeField(val, 'site')}
                                    value={
                                        defaultSite ? { value: defaultSite.value, label: defaultSite.name } : undefined
                                    }
                                    options={constructSelectOptions(state.availableSites)}
                                />
                            )}
                        </Field>
                        <Field label={<span>Project</span>} name="project" isRequired>
                            {(fieldArgs: any) => (
                                <LazyLoadingSelect
                                    {...fieldArgs.fieldProps}
                                    className="ac-form-select-container"
                                    classNamePrefix="ac-form-select"
                                    placeholder="Type to search"
                                    noOptionsMessage={() => 'Type to search'}
                                    hasMore={state.hasMoreProjects}
                                    onChange={(val: any) => handleChangeField(val, 'project')}
                                    value={
                                        defaultProject
                                            ? { value: defaultProject.value, label: defaultProject.name }
                                            : undefined
                                    }
                                    options={constructSelectOptions(state.availableProjects)}
                                    loadOptions={async (inputValue: any) => await handleLoadMoreProjects(inputValue)}
                                    isLoadingMore={isLoading}
                                />
                            )}
                        </Field>
                        <Field label={<span>Issue Type</span>} name="issueType" isRequired>
                            {(fieldArgs: any) => (
                                <Select
                                    {...fieldArgs.fieldProps}
                                    className="ac-form-select-container"
                                    classNamePrefix="ac-form-select"
                                    onChange={(val: any) => handleChangeField(val, 'issueType')}
                                    value={
                                        defaultIssueType
                                            ? { value: defaultIssueType.value, label: defaultIssueType.name }
                                            : undefined
                                    }
                                    options={constructSelectOptions(state.availableIssueTypes)}
                                />
                            )}
                        </Field>

                        <Field label={<span>Summary</span>} name="summary" isRequired>
                            {(fieldArgs: any) => (
                                <input
                                    {...fieldArgs.fieldProps}
                                    className="form-input"
                                    placeholder="What needs to be done?"
                                    type="text"
                                    onChange={handleUpdateSummary}
                                />
                            )}
                        </Field>
                        <div className="form-actions">
                            <button onClick={handleCancel} className="form-button button-secondary" type="button">
                                Cancel
                            </button>
                            <div>
                                <button className="form-button button-primary" type="submit">
                                    Create
                                </button>
                                <button
                                    className="form-button button-primary"
                                    style={{
                                        borderLeft: '1px solid var(--vscode-button-foreground)',
                                        padding: '6px',
                                    }}
                                    data-vscode-context='{"webviewSection": "createButton", "preventDefaultContextMenuItems": true}'
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.target.dispatchEvent(
                                            new MouseEvent('contextmenu', {
                                                bubbles: true,
                                                clientX: e.clientX,
                                                clientY: e.clientY,
                                            }),
                                        );
                                        e.stopPropagation();
                                    }}
                                >
                                    <ChevronDownIcon size="small" label="Expand" />
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Form>
        </div>
    );
};

export default CreateWorkItemWebview;
