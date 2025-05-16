import type { Config } from 'jest';

const config: Config = {
    projects: ['<rootDir>/jest.*.config.js'],
    verbose: true,
};

export const baseConfigFor = (project: string, testExtension: string): Config => ({
    displayName: project,
    roots: ['<rootDir>'],

    moduleNameMapper: {
        "^testsutil(/.+)?": "<rootDir>/testsutil$1"
    },    

    testMatch: [`**/*.test.${testExtension}`],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],

    transform: {
        '^.+\\.(js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: project === 'react' ? ({ esModuleInterop: true, isolatedModules: true }) : false,
            },
        ],
        '^.+\\.(css|styl|less|sass|scss)$': 'jest-css-modules-transform',
    },

    transformIgnorePatterns: ['/node_modules/(?!(@vscode/webview-ui-toolkit/|@microsoft/|exenv-es6/|@atlaskit/))'],

    collectCoverage: true,
    collectCoverageFrom: [
        `src/**/*.${testExtension}`,
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}', // Exclude test files
    ],
    coverageDirectory: `coverage/${project}`,
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover'],

    coverageThreshold: {
        global: testExtension === 'ts' ? {
            statements: 22,
            branches: 8,
            functions: 9,
            lines: 22,
        } : /* tsx */{
            statements: 5,
            branches: 4,
            functions: 4,
            lines: 5,
        },
    },
});

export default config;
