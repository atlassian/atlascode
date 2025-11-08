import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updatedSelectedSite',
    UpdatedSelectedProject = 'updatedSelectedProject',
    UpdateProjectOptions = 'updateProjectOptions',
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
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedProject;
          payload: {
              availableIssueTypes: IssueType[];
              selectedIssueTypeId?: string;
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
