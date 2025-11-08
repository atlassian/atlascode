export enum CreateWorkItemWebviewResponseType {
    WebviewReady = 'webviewReady',
    CreateWorkItem = 'createWorkItem',
    UpdateField = 'updateField',
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
              projectId: string;
          };
      }
    | {
          type: CreateWorkItemWebviewResponseType.UpdateField;
          payload: {
              feildType: 'site' | 'project' | 'issueType';
              id: string;
          };
      };
