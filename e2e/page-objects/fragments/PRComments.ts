import { expect, FrameLocator, Locator } from '@playwright/test';

const FORM_TEST_ID = 'common.comment-form';
const RICH_EDITOR_TEST_ID = 'common.rich-markdown-editor';

export class PRComments {
    readonly frame: FrameLocator;

    readonly commentsButton: Locator;
    readonly commentsForm: Locator;
    readonly commentsEditor: Locator;
    readonly commentsEditorConfirm: Locator;
    readonly commentsEditorCancel: Locator;
    readonly commentsEditorCheckbox: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.commentsButton = this.frame.getByRole('button', { name: 'Comments' });
        this.commentsForm = this.frame.getByTestId(FORM_TEST_ID);
        this.commentsEditor = this.commentsForm.getByTestId(RICH_EDITOR_TEST_ID);
        this.commentsEditorConfirm = this.commentsForm.getByRole('button', { name: 'save' });
        this.commentsEditorCancel = this.commentsForm.getByRole('button', { name: 'cancel' });
        this.commentsEditorCheckbox = this.commentsForm.getByRole('checkbox');
    }

    async expectCommentsSectionLoaded() {
        await expect(this.commentsButton).toBeVisible();
        await expect(this.commentsForm).toBeVisible();
        await expect(this.commentsEditor).toBeVisible();
        await expect(this.commentsEditorConfirm).toBeVisible();
        await expect(this.commentsEditorCancel).toBeVisible();
        await expect(this.commentsEditorCheckbox).toBeVisible();
    }
}
