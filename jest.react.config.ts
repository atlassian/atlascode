import type { Config } from 'jest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { baseConfigFor } = require('./jest.base.config.cjs');

const config: Config = {
    ...baseConfigFor('react', 'tsx'),

    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTestsReact.js'],
};

export default config;
