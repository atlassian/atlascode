import type { Config } from 'jest';
import { baseConfigFor } from "./jest.config";

const config: Config = {
    ...baseConfigFor('unit', 'ts'),

    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],
};

export default config;