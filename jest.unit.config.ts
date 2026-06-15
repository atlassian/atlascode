import type { Config } from 'jest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { baseConfigFor } = require('./jest.base.config.cjs');

const config: Config = {
    ...baseConfigFor('unit', 'ts'),

    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],
};

export default config;