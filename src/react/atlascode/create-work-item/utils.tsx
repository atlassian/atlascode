import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

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
    selectedProjectKey?: string;
    selectedIssueTypeId?: string;
}

export enum CreateFormActionType {
    SetSummary = 'setSummary',
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updateSelectedSite',
    UpdatedSelectedProject = 'updateSelectedProject',
    SetSelectedSite = 'setSelectedSite',
    SetSelectedProject = 'setSelectedProject',
    SetSelectedIssueType = 'setSelectedIssueType',
}

type CreateFormAction =
    | {
          type: CreateFormActionType.InitFields;
          payload: {
              availableSites: DetailedSiteInfo[];
              availableProjects: Project[];
              availableIssueTypes: IssueType[];
              selectedSiteId?: string;
              selectedProjectKey?: string;
              selectedIssueTypeId?: string;
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
              availableIssueTypes: IssueType[];
              selectedProjectKey?: string;
              selectedIssueTypeId?: string;
          };
      }
    | {
          type: CreateFormActionType.UpdatedSelectedProject;
          payload: {
              availableIssueTypes: IssueType[];
              selectedIssueTypeId?: string;
          };
      }
    | {
          type: CreateFormActionType.SetSelectedSite;
          payload: {
              selectedSiteId: string;
          };
      }
    | {
          type: CreateFormActionType.SetSelectedProject;
          payload: {
              selectedProjectKey: string;
          };
      }
    | {
          type: CreateFormActionType.SetSelectedIssueType;
          payload: {
              selectedIssueTypeId: string;
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
                    value: project.key,
                    iconPath: project.avatarUrls['48x48'],
                })),
                availableIssueTypes: action.payload.availableIssueTypes.map((issueType) => ({
                    name: issueType.name,
                    value: issueType.id,
                    iconPath: issueType.iconUrl,
                })),
                selectedSiteId: action.payload.selectedSiteId || action.payload.availableSites[0]?.id,
                selectedProjectKey: action.payload.selectedProjectKey || action.payload.availableProjects[0]?.key,
                selectedIssueTypeId: action.payload.selectedIssueTypeId || action.payload.availableIssueTypes[0]?.id,
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
                availableIssueTypes: action.payload.availableIssueTypes.map((issueType) => ({
                    name: issueType.name,
                    value: issueType.id,
                    iconPath: issueType.iconUrl,
                })),
                selectedProjectKey: action.payload.selectedProjectKey || action.payload.availableProjects[0]?.key,
                selectedIssueTypeId: action.payload.selectedIssueTypeId || action.payload.availableIssueTypes[0]?.id,
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
            };
        }
        case CreateFormActionType.SetSelectedSite: {
            return {
                ...state,
                selectedSiteId: action.payload.selectedSiteId,
            };
        }
        case CreateFormActionType.SetSelectedProject: {
            return {
                ...state,
                selectedProjectKey: action.payload.selectedProjectKey,
            };
        }
        case CreateFormActionType.SetSelectedIssueType: {
            return {
                ...state,
                selectedIssueTypeId: action.payload.selectedIssueTypeId,
            };
        }
        default:
            return state;
    }
}
