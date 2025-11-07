export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
}
export type CreateWorkItemWebviewProviderMessage = {
    type: CreateWorkItemWebviewProviderMessageType.InitFields;
    payload: {
        issueTypes: { id: string; name: string }[];
        projects: { key: string; name: string }[];
    };
};
