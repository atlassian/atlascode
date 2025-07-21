import { Frame, Locator } from 'playwright/test';

export class StartWorkPage {
    readonly issueFrame: Frame;

    readonly startButton: Locator;

    constructor(frame: Frame) {
        this.issueFrame = frame;
        this.startButton = this.issueFrame.getByTestId('start-work.start-button');
    }

    async startWork() {
        await this.startButton.click();
    }
}
