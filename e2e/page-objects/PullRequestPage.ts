import { expect, FrameLocator, Page } from '@playwright/test';
import {
    PRComments,
    PRCommits,
    PRFiles,
    PRHeader,
    PRInlineComment,
    PRSidebar,
    PRSummary,
    PRTabs,
    PRTitle,
} from 'e2e/page-objects/fragments';

export class PullRequestPage {
    readonly page: Page;

    readonly frame: FrameLocator;
    readonly header: PRHeader;
    readonly title: PRTitle;
    readonly summary: PRSummary;
    readonly commits: PRCommits;
    readonly files: PRFiles;
    readonly inlineComment: PRInlineComment;
    readonly comments: PRComments;
    readonly sidebar: PRSidebar;
    readonly tabs: PRTabs;

    constructor(page: Page) {
        this.page = page;

        this.frame = this.page.frameLocator('iframe.webview').frameLocator('iframe[title="Pull Request 123"]');
        this.header = new PRHeader(this.frame);
        this.title = new PRTitle(this.frame);
        this.summary = new PRSummary(this.frame);
        this.commits = new PRCommits(this.frame);
        this.files = new PRFiles(this.frame, this.page);
        this.inlineComment = new PRInlineComment(this.frame, this.page);
        this.comments = new PRComments(this.frame);
        this.sidebar = new PRSidebar(this.frame);
        this.tabs = new PRTabs(this.frame);
    }

    async expectPRPageLoaded() {
        await expect(this.header.title).toBeVisible();
    }
}
