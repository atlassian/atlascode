import type { Config } from 'jest';
import { baseConfigFor } from "./jest.config";

const config: Config = {
    ...baseConfigFor('react', 'tsx'),

    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTestsReact.js'],
};

export default config;
