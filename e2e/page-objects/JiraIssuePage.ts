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

    getStatus() {
        return this.status.getStatus();
    }

    updateStatus(nextStatus: string) {
        return this.status.updateStatus(nextStatus);
    }

    expectStatus(expectedStatus: string) {
        return this.status.expectStatus(expectedStatus);
    }

    getDescription() {
        return this.description.getDescription();
    }

    updateDescription(newDescription: string) {
        return this.description.updateDescription(newDescription);
    }

    expectDescription(description: string) {
        return this.description.expectDescription(description);
    }

    addComment(commentText: string) {
        return this.comments.addComment(commentText);
    }

    expectComment(commentText: string) {
        return this.comments.expectComment(commentText);
    }

    addAttachment(filePath: string) {
        return this.content.addAttachment(filePath);
    }

    expectAttachment(filename: string) {
        return this.content.expectAttachment(filename);
    }

    async saveChanges() {
        await this.frame.getByRole('button', { name: 'Save' }).click();
    }
}
