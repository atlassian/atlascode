import { expect, Frame, Locator } from 'playwright/test';

const QUICK_ADD_TEST_ID = 'issue.add-content-dropdown';
const ATTACHMENT_MODAL_TEST_ID = 'issue.attachment-modal';
const ATTACHMENTS_TEST_ID = 'issue.attachments';

export class IssueQuickContent {
    readonly frame: Frame;

    readonly quickAddContent: Locator;
    readonly attachmentModal: Locator;
    readonly attachments: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.quickAddContent = this.frame.getByTestId(`${QUICK_ADD_TEST_ID}--content`);
        this.attachmentModal = this.frame.getByTestId(ATTACHMENT_MODAL_TEST_ID);
        this.attachments = this.frame.getByTestId(ATTACHMENTS_TEST_ID);
    }

    async addContent(option: string) {
        await this.frame.getByTestId(`${QUICK_ADD_TEST_ID}--trigger`).click();
        const menuitem = this.quickAddContent.getByRole('menuitem', { name: option });
        await menuitem.click();
    }

    async addAttachment(filePath: string) {
        await this.addContent('Attachment');

        await this.attachmentModal.locator('input[type="file"]').setInputFiles(filePath);
        await this.frame.waitForTimeout(1_000);

        const saveButton = this.attachmentModal.getByRole('button', { name: 'Save' });
        expect(saveButton).toBeVisible();
        expect(saveButton).toBeEnabled();
        await saveButton.click();
    }

    hasAttachment(filename: string) {
        return expect(this.attachments.locator(`text=${filename}`).first()).toBeVisible();
    }
}
