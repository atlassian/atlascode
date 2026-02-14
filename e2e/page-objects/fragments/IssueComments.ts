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
        // Support both simple editor (textarea) and Atlaskit editor (contenteditable)
        const textarea = this.newComment.locator('textarea').first();
        const contentEditable = this.newComment.locator('[contenteditable="true"]').first();
        await Promise.race([
            textarea.waitFor({ state: 'visible', timeout: 3000 }).then(() => 'textarea' as const),
            contentEditable.waitFor({ state: 'visible', timeout: 3000 }).then(() => 'contenteditable' as const),
        ]).catch(() => {
            throw new Error('Add-comment editor (textarea or contenteditable) did not appear within 3s');
        });
        const useTextarea = await textarea.isVisible().catch(() => false);
        if (useTextarea) {
            await textarea.fill(commentText);
        } else {
            await contentEditable.click();
            await contentEditable.fill(commentText);
        }
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

    /**
     * Jira DC (and legacy) expects comment body as wiki markup string. If the app sends ADF object,
     * the server returns: "Can not deserialize... START_OBJECT" or "Cannot deserialize... JsonToken.START_OBJECT".
     * Returns true if the error banner shows this body-type error.
     */
    async hasCommentBodyTypeError(): Promise<boolean> {
        const bodyTypeErrorPattern =
            /Error posting comment|START_OBJECT|Can not deserialize|Cannot deserialize|JsonToken\.START_OBJECT|java\.lang\.String/;
        const errorEl = this.frame.getByText(bodyTypeErrorPattern);
        return errorEl
            .first()
            .isVisible()
            .catch(() => false);
    }

    async getCommentBodyTypeErrorText(): Promise<string> {
        const bodyTypeErrorPattern =
            /Error posting comment|START_OBJECT|Can not deserialize|Cannot deserialize|JsonToken\.START_OBJECT|java\.lang\.String/;
        const errorEl = this.frame.getByText(bodyTypeErrorPattern).first();
        if (await errorEl.isVisible().catch(() => false)) {
            return (await errorEl.textContent()) ?? '';
        }
        return '';
    }
}
