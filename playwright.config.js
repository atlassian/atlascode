import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        viewport: {
            width: 1600,
            height: 800,
        },
        // Docs: https://playwright.dev/docs/videos
        // To see all of the videos/traces, change this to 'on'
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
});
