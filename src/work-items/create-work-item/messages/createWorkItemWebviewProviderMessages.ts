import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updatedSelectedSite',
    UpdatedSelectedProject = 'updatedSelectedProject',
}

export type CreateWorkItemWebviewProviderMessage =
    | {
          type: CreateWorkItemWebviewProviderMessageType.InitFields;
          payload: {
              availableIssueTypes: IssueType[];
              availableProjects: Project[];
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
      };
