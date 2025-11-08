import './CreateWorkItem.css';

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
};

const CreateWorkItemWebview: React.FC = () => {
    const [state, dispatch] = React.useReducer(createReducer, emptyState);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    const onMessageHandler = React.useCallback((msg: CreateWorkItemWebviewProviderMessage) => {
        switch (msg.type) {
            case CreateWorkItemWebviewProviderMessageType.InitFields: {
                const fields = msg.payload;
                dispatch({
                    type: CreateFormActionType.InitFields,
                    payload: fields,
                });
                setIsLoading(false);
                break;
            }
            case CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite: {
                const fields = msg.payload;
                dispatch({
                    type: CreateFormActionType.UpdatedSelectedSite,
                    payload: fields,
                });
                break;
            }
            case CreateWorkItemWebviewProviderMessageType.UpdatedSelectedProject: {
                const fields = msg.payload;
                dispatch({
                    type: CreateFormActionType.UpdatedSelectedProject,
                    payload: fields,
                });
                break;
            }
            default:
                break;
        }
    }, []);

    const { postMessage, postMessagePromise } = useMessagingApi<
        CreateWorkItemWebviewResponse,
        CreateWorkItemWebviewProviderMessage,
        CreateWorkItemWebviewProviderMessage
    >(onMessageHandler);

    React.useEffect(() => {
        postMessage({ type: CreateWorkItemWebviewResponseType.WebviewReady });
    }, [postMessage]);

    const handleSubmit = React.useCallback(() => {
        postMessage({
            type: CreateWorkItemWebviewResponseType.CreateWorkItem,
            payload: {
                summary: 'Example Summary',
                description: 'Example Description',
                issueTypeId: state.selectedIssueTypeId || '',
                projectId: state.selectedProjectId || '',
            },
        });
    }, [postMessage, state.selectedIssueTypeId, state.selectedProjectId]);

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

    return (
        <div className="view-container">
            <div className="header"></div>
            <form>
                <div className="form-group">
                    <label htmlFor="site-picker">Site</label>
                    <Select
                        isRequired={true}
                        inputId="site-picker"
                        name="site-picker"
                        onChange={(val: any) => handleChangeField(val, 'site')}
                        defaultValue={state.selectedSiteId}
                        options={constructSelectOptions(state.availableSites)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="project-picker">Project</label>
                    <LazyLoadingSelect
                        isRequired={true}
                        placeholder="Type to search"
                        noOptionsMessage={() => 'Type to search'}
                        inputId="project-picker"
                        name="project-picker"
                        hasMore={state.hasMoreProjects}
                        onChange={(val: any) => handleChangeField(val, 'project')}
                        defaultValue={state.selectedProjectId}
                        options={constructSelectOptions(state.availableProjects)}
                        loadOptions={async (inputValue: any) => await handleLoadMoreProjects(inputValue)}
                        isLoadingMore={isLoading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="issue-type-picker">Issue Type</label>
                    <Select
                        isRequired={true}
                        inputId="issue-type-picker"
                        name="issue-type-picker"
                        onChange={(val: any) => handleChangeField(val, 'issueType')}
                        defaultValue={state.selectedIssueTypeId}
                        options={constructSelectOptions(state.availableIssueTypes)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="summary-input">Summary</label>
                    <input required id="summary-input" type="text" />
                </div>
                <div className="form-actions">
                    <button type="button">Cancel</button>
                    <button type="submit" onClick={handleSubmit}>
                        Create Work Item
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateWorkItemWebview;
