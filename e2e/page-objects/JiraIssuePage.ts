import { Frame } from 'playwright/test';

import { IssueComments, IssueDescription, IssueQuickContent, IssueStatus } from './fragments';

export class JiraIssuePage {
    readonly frame: Frame;

    readonly status: IssueStatus;
    readonly description: IssueDescription;
    readonly comments: IssueComments;
    readonly content: IssueQuickContent;

    constructor(frame: Frame) {
        this.frame = frame;

        this.status = new IssueStatus(this.frame);
        this.description = new IssueDescription(this.frame);
        this.comments = new IssueComments(this.frame);
        this.content = new IssueQuickContent(this.frame);
    }

    async saveChanges() {
        await this.frame.getByRole('button', { name: 'Save' }).click();
    }
}
