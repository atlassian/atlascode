import { Project } from '@atlassian-pi/jira-pi-common-models';
import {
    CreateWorkItemWebviewProviderMessage,
    CreateWorkItemWebviewProviderMessageType,
} from 'src/work-items/create-work-item/messages/createWorkItemWebviewProviderMessages';

import { CreateFormState, createReducer } from './utils';

describe('createReducer', () => {
    it('uses the project ID as the option value after changing Jira sites', () => {
        const project = {
            id: '10001',
            key: 'TEST',
            name: 'Test Project',
            avatarUrls: {
                '48x48': 'https://example.com/project-avatar.png',
            },
        } as Project;

        const initialState: CreateFormState = {
            summary: '',
            availableSites: [],
            availableProjects: [],
            availableIssueTypes: [],
            requiredFieldsForIssueType: [],
        };

        const action: CreateWorkItemWebviewProviderMessage = {
            type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite,
            payload: {
                availableProjects: [project],
                hasMoreProjects: false,
                availableIssueTypes: [],
                selectedProjectId: project.id,
                requiredFields: [],
            },
        };

        const result = createReducer(initialState, action);

        expect(result.availableProjects).toEqual([
            {
                name: project.name,
                value: project.id,
                iconPath: project.avatarUrls['48x48'],
            },
        ]);

        expect(result.selectedProjectId).toBe(result.availableProjects[0].value);
    });
});
