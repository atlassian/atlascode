import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        retries: 3,
        viewport: {
            width: 1600,
            height: 800,
        },
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
});
