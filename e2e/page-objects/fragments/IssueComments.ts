import { expect, Frame, Locator } from 'playwright/test';

const COMMENTS_SECTION_TEST_ID = 'issue.comments-section';
const NEW_COMMENT_TEST_ID = 'issue.new-comment';

export class IssueComments {
    readonly frame: Frame;

    readonly commentsSection: Locator;
    readonly newComment: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.commentsSection = this.frame.getByTestId(COMMENTS_SECTION_TEST_ID);
        this.newComment = this.frame.getByTestId(NEW_COMMENT_TEST_ID);
    }

    async addNew(commentText: string) {
        await this.fillComment(commentText);
        await this.saveNew();
    }

    async fillComment(commentText: string) {
        const input = this.newComment.getByPlaceholder('Add a comment...');
        await input.click();
        const textarea = this.newComment.locator('textarea').first();
        await expect(textarea).toBeVisible();
        await textarea.fill(commentText);
    }

    async saveNew() {
        const saveButton = this.newComment.getByRole('button', { name: 'Save' });
        await expect(saveButton).toBeVisible();
        await saveButton.click();
    }

    async expectExists(commentText: string) {
        const comment = this.commentsSection.getByText(commentText);
        await expect(comment).toBeVisible();
    }
}
