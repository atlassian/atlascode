import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        viewport: {
            width: 1600,
            height: 800,
        }
    },
});