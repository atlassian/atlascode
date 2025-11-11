import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';

export enum CreateWorkItemWebviewResponseType {
    WebviewReady = 'webviewReady',
    CreateWorkItem = 'createWorkItem',
    UpdateField = 'updateField',
    UpdateSelectOptions = 'updateSelectOptions',
}
export interface CreateWorkItemViewRequiredField {
    field: FieldUI;
    selectOptions?: any[];
}

export type CreateWorkItemWebviewResponse =
    | {
          type: CreateWorkItemWebviewResponseType.WebviewReady;
      }
    | {
          type: CreateWorkItemWebviewResponseType.CreateWorkItem;
          payload: {
              summary: string;
              onCompletion?: 'view' | 'startWork' | 'generateCode';
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
