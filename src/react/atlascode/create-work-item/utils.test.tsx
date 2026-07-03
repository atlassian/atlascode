import { CreateWorkItemWebviewProviderMessageType } from 'src/work-items/create-work-item/messages/createWorkItemWebviewProviderMessages';
import { expansionCastTo } from 'testsutil';

import { CreateFormState, createReducer } from './utils';

describe('createReducer', () => {
    const emptyState: CreateFormState = {
        summary: '',
        availableSites: [],
        availableProjects: [],
        availableIssueTypes: [],
        selectedSiteId: undefined,
        selectedProjectId: undefined,
        selectedIssueTypeId: undefined,
        requiredFieldsForIssueType: [],
        createScreenHasFields: true,
    };

    it('stores whether the selected issue type has create screen fields on init', () => {
        const result = createReducer(emptyState, {
            type: CreateWorkItemWebviewProviderMessageType.InitFields,
            payload: {
                availableSites: [expansionCastTo({ id: 'site-1', name: 'Site 1', avatarUrl: '' })],
                availableProjects: [
                    expansionCastTo({ id: 'project-1', key: 'TEST', name: 'Test Project', avatarUrls: {} }),
                ],
                hasMoreProjects: false,
                availableIssueTypes: [expansionCastTo({ id: 'issue-type-1', name: 'Task', iconUrl: '' })],
                selectedSiteId: 'site-1',
                selectedProjectId: 'project-1',
                selectedIssueTypeId: 'issue-type-1',
                requiredFields: [],
                createScreenHasFields: false,
            },
        });

        expect(result.createScreenHasFields).toBe(false);
    });

    it('updates whether the selected issue type has create screen fields', () => {
        const result = createReducer(
            { ...emptyState, createScreenHasFields: false },
            {
                type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedIssueType,
                payload: {
                    requiredFields: [],
                    createScreenHasFields: true,
                },
            },
        );

        expect(result.createScreenHasFields).toBe(true);
    });
});
