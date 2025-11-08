import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

export enum CreateWorkItemWebviewProviderMessageType {
    InitFields = 'initFields',
}

export type CreateWorkItemWebviewProviderMessage = {
    type: CreateWorkItemWebviewProviderMessageType.InitFields;
    payload: {
        availableIssueTypes: IssueType[];
        availableProjects: Project[];
        availableSites: DetailedSiteInfo[];
        selectedSiteId?: string;
        selectedProjectKey?: string;
        selectedIssueTypeId?: string;
    };
};
