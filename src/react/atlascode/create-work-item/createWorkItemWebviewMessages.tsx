export enum CreateWorkItemWebviewResponseType {
    WebviewReady = 'webviewReady',
    CreateWorkItem = 'createWorkItem',
    UpdateSite = 'updateSite',
    UpdateProject = 'updateProject',
    UpdateIssueType = 'updateIssueType',
}

export type CreateWorkItemWebviewResponse =
    | {
          type: CreateWorkItemWebviewResponseType.WebviewReady;
      }
    | {
          type: CreateWorkItemWebviewResponseType.CreateWorkItem;
          payload: {
              summary: string;
              description: string;
              issueTypeId: string;
              projectKey: string;
          };
      }
    | {
          type: CreateWorkItemWebviewResponseType.UpdateSite;
          payload: {
              siteId: string;
          };
      }
    | {
          type: CreateWorkItemWebviewResponseType.UpdateProject;
          payload: {
              projectKey: string;
          };
      }
    | {
          type: CreateWorkItemWebviewResponseType.UpdateIssueType;
          payload: {
              issueTypeId: string;
          };
      };
