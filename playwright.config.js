import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        viewport: {
            width: 1600,
            height: 800,
        },
    },
    use: {
        // Docs: https://playwright.dev/docs/videos
        // To see all of the videos, change this to 'on'
        video: 'retain-on-failure',
    },
});
