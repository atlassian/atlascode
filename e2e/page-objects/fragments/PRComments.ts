import { expect, FrameLocator, Locator } from '@playwright/test';

const FORM_TEST_ID = 'common.comment-form';
const RICH_EDITOR_TEST_ID = 'common.rich-markdown-editor';

export class PRComments {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly form: Locator;
    readonly editor: Locator;
    readonly editorContent: Locator;
    readonly editorConfirmButton: Locator;
    readonly editorCancelButton: Locator;
    readonly richEditorCheckbox: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Comments' });
        this.form = this.frame.getByTestId(FORM_TEST_ID);
        this.editor = this.form.getByTestId(RICH_EDITOR_TEST_ID);
        this.editorContent = this.editor.locator('div.ProseMirror[contenteditable="true"]');
        this.editorConfirmButton = this.form.getByRole('button', { name: 'save' });
        this.editorCancelButton = this.form.getByRole('button', { name: 'cancel' });
        this.richEditorCheckbox = this.form.getByRole('checkbox');
    }

    async expectCommentsSectionLoaded() {
        await expect(this.sectionButton).toBeVisible();

        // Wait for form to be visible with longer timeout and scroll into view
        await expect(this.form).toBeVisible({ timeout: 10000 });

        await expect(this.editor).toBeVisible();
        await expect(this.editorContent).toBeVisible();
        await expect(this.editorConfirmButton).toBeVisible();
        await expect(this.editorCancelButton).toBeVisible();
        await expect(this.richEditorCheckbox).toBeVisible();
    }
}
