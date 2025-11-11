import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updatedSelectedSite',
    UpdatedSelectedProject = 'updatedSelectedProject',
    UpdatedSelectedIssueType = 'updatedSelectedIssueType',
    UpdateProjectOptions = 'updateProjectOptions',
}
// TODO implement required fields properly
export interface CreateWorkItemRequiredField {
    field: FieldUI;
    selectOptions?: any[];
}

export type CreateWorkItemWebviewProviderMessage =
    | {
          type: CreateWorkItemWebviewProviderMessageType.InitFields;
          payload: {
              availableIssueTypes: IssueType[];
              availableProjects: Project[];
              hasMoreProjects: boolean;
              availableSites: DetailedSiteInfo[];
              selectedSiteId?: string;
              selectedProjectId?: string;
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemRequiredField[];
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite;
          payload: {
              availableProjects: Project[];
              hasMoreProjects: boolean;
              availableIssueTypes: IssueType[];
              selectedProjectId?: string;
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemRequiredField[];
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedProject;
          payload: {
              availableIssueTypes: IssueType[];
              selectedIssueTypeId?: string;
              requiredFields: CreateWorkItemRequiredField[];
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedIssueType;
          payload: {
              requiredFields: CreateWorkItemRequiredField[];
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdateProjectOptions;
          payload: {
              availableProjects: Project[];
              hasMoreProjects: boolean;
          };
          nonce: string;
      };
