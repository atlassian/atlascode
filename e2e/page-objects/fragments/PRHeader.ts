import { FrameLocator, Locator } from '@playwright/test';

export class PRHeader {
    readonly frame: FrameLocator;

    readonly title: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.title = frame.getByText('test-repository: Pull request #123');
    }
}
