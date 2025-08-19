import { expect, FrameLocator, Page } from '@playwright/test';
import { PRComments, PRCommits, PRFiles, PRHeader, PRSidebar, PRSummary, PRTitle } from 'e2e/page-objects/fragments';

export class PullRequestPage {
    readonly page: Page;

    readonly prFrame: FrameLocator;
    readonly prHeader: PRHeader;
    readonly prTitle: PRTitle;
    readonly prSummary: PRSummary;
    readonly prCommits: PRCommits;
    readonly prFiles: PRFiles;
    readonly prComments: PRComments;
    readonly prSidebar: PRSidebar;

    constructor(page: Page) {
        this.page = page;

        this.prFrame = this.page.frameLocator('iframe.webview').frameLocator('iframe[title="Pull Request 123"]');
        this.prHeader = new PRHeader(this.prFrame);
        this.prTitle = new PRTitle(this.prFrame);
        this.prSummary = new PRSummary(this.prFrame);
        this.prCommits = new PRCommits(this.prFrame);
        this.prFiles = new PRFiles(this.prFrame);
        this.prComments = new PRComments(this.prFrame);
        this.prSidebar = new PRSidebar(this.prFrame);
    }

    async expectPRPageLoaded() {
        await expect(this.prHeader.headerTitle).toBeVisible();
    }
}
