import { expect, FrameLocator, Locator } from '@playwright/test';

const FORM_TEST_ID = 'common.comment-form';
const RICH_EDITOR_TEST_ID = 'common.rich-markdown-editor';

export class PRComments {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly form: Locator;
    readonly editor: Locator;
    readonly editorConfirmButton: Locator;
    readonly editorCancelButton: Locator;
    readonly richEditorCheckbox: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Comments' });
        this.form = this.frame.getByTestId(FORM_TEST_ID);
        this.editor = this.form.getByTestId(RICH_EDITOR_TEST_ID);
        this.editorConfirmButton = this.form.getByRole('button', { name: 'save' });
        this.editorCancelButton = this.form.getByRole('button', { name: 'cancel' });
        this.richEditorCheckbox = this.form.getByRole('checkbox');
    }

    async expectCommentsSectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.form).toBeVisible();
        await expect(this.editor).toBeVisible();
        await expect(this.editorConfirmButton).toBeVisible();
        await expect(this.editorCancelButton).toBeVisible();
        await expect(this.richEditorCheckbox).toBeVisible();
    }

    async addNew(commentText: string) {
        await this.ensureDetailsTabIsActive();
        await this.fillComment(commentText);
        await this.saveNew();
    }

    async ensureDetailsTabIsActive() {
        const possibleSelectors: Locator[] = [
            this.frame.getByRole('tab', { name: 'Details' }),
            this.frame.getByRole('tab', { name: /details/i }),
            this.frame.getByText('Details'),
            this.frame.locator('[aria-label="Details"]'),
            this.frame.locator('button:has-text("Details")'),
        ];

        for (const selector of possibleSelectors) {
            try {
                if (await selector.isVisible({ timeout: 1000 })) {
                    await selector.click();
                    // Wait for the comments form to be available as a signal the tab loaded
                    await this.form.waitFor({ state: 'visible', timeout: 3000 });
                    return;
                }
            } catch {
                continue;
            }
        }
    }

    async fillComment(commentText: string) {
        // Prefer the rich editor within the known form
        try {
            await this.editor.waitFor({ state: 'visible', timeout: 5000 });
            await this.editor.click();
            await this.editor.fill(commentText);
            return;
        } catch {
            // fall through to alternative editors
        }

        // Fallbacks: ProseMirror or generic input/textarea inside the frame
        const richTextEditor = this.frame.locator('.ProseMirror').first();
        try {
            await richTextEditor.waitFor({ state: 'visible', timeout: 5000 });
            await richTextEditor.click();
            await richTextEditor.fill(commentText);
            return;
        } catch {
            // last resort: any text input or textarea
        }

        const textInput = this.frame.locator('input[type="text"], textarea').first();
        await textInput.waitFor({ state: 'visible' });
        await textInput.click();
        await textInput.fill(commentText);
    }

    async saveNew() {
        // Prefer the explicitly named save button in the form
        try {
            await expect(this.editorConfirmButton).toBeVisible();
            await this.editorConfirmButton.click();
            return;
        } catch {
            // fall back to a more generic Save button (older UI)
        }

        const saveButton = this.frame.getByRole('button', { name: 'Save' });
        await expect(saveButton).toBeVisible();
        await saveButton.click();
    }

    async expectExists(commentText: string) {
        // Try a set of robust selectors that cover common MUI and generic text renderings
        const possibleSelectors: Locator[] = [
            this.frame.locator('p.MuiTypography-root.MuiTypography-body1 p', { hasText: commentText }),
            this.frame.locator('p.MuiTypography-root p', { hasText: commentText }),
            this.frame.locator('.MuiTypography-body1', { hasText: commentText }),
            this.frame.locator('p:has(p)', { hasText: commentText }),
            this.frame.getByText(commentText),
            this.frame.locator(`*:has-text("${commentText}")`),
            this.frame.locator('[class*="MuiTypography"]', { hasText: commentText }),
        ];

        for (const selector of possibleSelectors) {
            try {
                if (await selector.isVisible({ timeout: 3000 })) {
                    await expect(selector).toBeVisible();
                    return;
                }
            } catch {
                continue;
            }
        }

        // Final attempt with a specific structure
        const muiStructure = this.frame.locator('p.MuiTypography-root.MuiTypography-body1:has(p)');
        await expect(muiStructure).toBeVisible();
        await expect(muiStructure).toContainText(commentText);
    }

    async clickFileLink(fileName: string) {
        const possibleSelectors: Locator[] = [
            this.frame.locator(`button:has(p:text("${fileName}")), a:has(p:text("${fileName}"))`),
            this.frame.locator(`td:has-text("${fileName}") button, td:has-text("${fileName}") a`),
            this.frame.locator(`[role="button"]:has-text("${fileName}"), a:has-text("${fileName}")`),
            this.frame.locator(`table td a:has-text("${fileName}"), table td button:has-text("${fileName}")`),
            this.frame.getByRole('link', { name: fileName }),
            this.frame.getByRole('button', { name: fileName }),
            this.frame.locator(`*:has-text("${fileName}")`).first(),
        ];

        for (const selector of possibleSelectors) {
            try {
                if (await selector.isVisible({ timeout: 3000 })) {
                    await selector.click();
                    return;
                }
            } catch {
                continue;
            }
        }

        throw new Error(`File link "${fileName}" not found or not clickable in Files Changed section`);
    }
}
