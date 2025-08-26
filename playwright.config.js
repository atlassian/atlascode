import { defineConfig } from '@playwright/test';

export default defineConfig({
    retries: 3,
    use: {
        viewport: {
            width: 1600,
            height: 800,
        },
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
});
