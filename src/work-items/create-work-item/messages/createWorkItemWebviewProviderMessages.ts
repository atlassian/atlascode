import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
    UpdatedSelectedSite = 'updatedSelectedSite',
}

export type CreateWorkItemWebviewProviderMessage =
    | {
          type: CreateWorkItemWebviewProviderMessageType.InitFields;
          payload: {
              availableIssueTypes: IssueType[];
              availableProjects: Project[];
              availableSites: DetailedSiteInfo[];
              selectedSiteId?: string;
              selectedProjectKey?: string;
              selectedIssueTypeId?: string;
          };
      }
    | {
          type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite;
          payload: {
              availableProjects: Project[];
              availableIssueTypes: IssueType[];
              selectedProjectKey?: string;
              selectedIssueTypeId?: string;
          };
      };
