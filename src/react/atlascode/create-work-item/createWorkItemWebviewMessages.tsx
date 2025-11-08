export enum CreateWorkItemWebviewResponseType {
    WebviewReady = 'webviewReady',
    CreateWorkItem = 'createWorkItem',
    UpdateField = 'updateField',
    UpdateSelectOptions = 'updateSelectOptions',
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
      }
    | {
          type: CreateWorkItemWebviewResponseType.UpdateSelectOptions;
          payload: {
              fieldType: 'site' | 'project' | 'issueType';
              query: string;
              nonce: string;
          };
      };
