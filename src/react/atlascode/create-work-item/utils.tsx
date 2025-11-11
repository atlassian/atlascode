import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { CreateWorkItemViewRequiredField } from './createWorkItemWebviewMessages';

export interface CreateOptionFields {
    name: string;
    value: string;
    iconPath?: string;
}

export interface CreateFormState {
    summary: string;
    availableSites: CreateOptionFields[];
    availableProjects: CreateOptionFields[];
    availableIssueTypes: CreateOptionFields[];
    selectedSiteId?: string;
    selectedProjectId?: string;
    selectedIssueTypeId?: string;
    hasMoreProjects?: boolean;
    requiredFieldsForIssueType: CreateWorkItemViewRequiredField[];
}

export enum CreateFormActionType {
    SetSummary = 'setSummary',
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updateSelectedSite',
    UpdatedSelectedProject = 'updateSelectedProject',
    UpdatedSelectedIssueType = 'updatedSelectedIssueType',
    SetSelectedField = 'setSelectedField',
}

type CreateFormAction =
    | {
          type: CreateFormActionType.InitFields;
          payload: {
              availableSites: DetailedSiteInfo[];
              availableProjects: Project[];
              hasMoreProjects: boolean;
              availableIssueTypes: IssueType[];
              selectedSiteId?: string;
              selectedProjectId?: string;
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemViewRequiredField[];
          };
      }
    | {
          type: CreateFormActionType.SetSummary;
          payload: {
              summary: string;
          };
      }
    | {
          type: CreateFormActionType.UpdatedSelectedSite;
          payload: {
              availableProjects: Project[];
              hasMoreProjects: boolean;
              availableIssueTypes: IssueType[];
              selectedProjectId?: string;
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemViewRequiredField[];
          };
      }
    | {
          type: CreateFormActionType.UpdatedSelectedProject;
          payload: {
              availableIssueTypes: IssueType[];
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemViewRequiredField[];
          };
      }
    | {
          type: CreateFormActionType.UpdatedSelectedIssueType;
          payload: {
              requiredFields: CreateWorkItemViewRequiredField[];
          };
      }
    | {
          type: CreateFormActionType.SetSelectedField;
          payload: {
              fieldType: 'site' | 'project' | 'issueType';
              id: string;
          };
      };

export function createReducer(state: CreateFormState, action: CreateFormAction): CreateFormState {
    switch (action.type) {
        case CreateFormActionType.InitFields: {
            return {
                ...state,
                availableSites: action.payload.availableSites.map((site) => ({
                    name: site.name,
                    value: site.id,
                    iconPath: site.avatarUrl,
                })),
                availableProjects: action.payload.availableProjects.map((project) => ({
                    name: project.name,
                    value: project.id,
                    iconPath: project.avatarUrls['48x48'],
                })),
                hasMoreProjects: action.payload.hasMoreProjects,
                availableIssueTypes: action.payload.availableIssueTypes.map((issueType) => ({
                    name: issueType.name,
                    value: issueType.id,
                    iconPath: issueType.iconUrl,
                })),
                selectedSiteId: action.payload.selectedSiteId || action.payload.availableSites[0]?.id,
                selectedProjectId: action.payload.selectedProjectId || action.payload.availableProjects[0]?.id,
                selectedIssueTypeId: action.payload.selectedIssueTypeId || action.payload.availableIssueTypes[0]?.id,
                requiredFieldsForIssueType: action.payload.requiredFields,
            };
        }
        case CreateFormActionType.SetSummary: {
            return {
                ...state,
                summary: action.payload.summary,
            };
        }
        case CreateFormActionType.UpdatedSelectedSite: {
            return {
                ...state,
                availableProjects: action.payload.availableProjects.map((project) => ({
                    name: project.name,
                    value: project.key,
                    iconPath: project.avatarUrls['48x48'],
                })),
                hasMoreProjects: action.payload.hasMoreProjects,
                availableIssueTypes: action.payload.availableIssueTypes.map((issueType) => ({
                    name: issueType.name,
                    value: issueType.id,
                    iconPath: issueType.iconUrl,
                })),
                selectedProjectId: action.payload.selectedProjectId || action.payload.availableProjects[0]?.id,
                selectedIssueTypeId: action.payload.selectedIssueTypeId || action.payload.availableIssueTypes[0]?.id,
                requiredFieldsForIssueType: action.payload.requiredFields,
            };
        }
        case CreateFormActionType.UpdatedSelectedProject: {
            return {
                ...state,
                availableIssueTypes: action.payload.availableIssueTypes.map((issueType) => ({
                    name: issueType.name,
                    value: issueType.id,
                    iconPath: issueType.iconUrl,
                })),
                selectedIssueTypeId: action.payload.selectedIssueTypeId || action.payload.availableIssueTypes[0]?.id,
                requiredFieldsForIssueType: action.payload.requiredFields,
            };
        }
        case CreateFormActionType.UpdatedSelectedIssueType: {
            return {
                ...state,
                requiredFieldsForIssueType: action.payload.requiredFields,
            };
        }
        case CreateFormActionType.SetSelectedField: {
            switch (action.payload.fieldType) {
                case 'site':
                    return {
                        ...state,
                        selectedSiteId: action.payload.id,
                    };
                case 'project':
                    return {
                        ...state,
                        selectedProjectId: action.payload.id,
                    };
                case 'issueType':
                    return {
                        ...state,
                        selectedIssueTypeId: action.payload.id,
                    };
                default:
                    return state;
            }
        }
        default:
            return state;
    }
}
