import type { Config } from 'jest';

const config: Config = {
    projects: ['<rootDir>/jest.*.config.ts'],
    verbose: true,
};

function modulesPattern(...args: string[]): string[] | undefined {
    if (args.length === 0) {
        return undefined;
    }
    return [`/node_modules/(?!(${args.join('|')}))`];
}

export const baseConfigFor = (project: string, testExtension: string): Config => ({
    displayName: project,
    roots: ['<rootDir>'],

    moduleNameMapper: {
        '^src(.*)$': '<rootDir>/src$1',
        '^testsutil(/.+)?': '<rootDir>/testsutil$1',
        'monaco-editor': '<rootDir>/__mocks__/monaco-editor.ts',
        'package.json': '<rootDir>/__mocks__/packagejson.ts',
    },

    testMatch: [`**/*.test.${testExtension}`],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],

    transform: {
        '^.+\\.(js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: project === 'react' ? { esModuleInterop: true, isolatedModules: true } : false,
            },
        ],
        '^.+\\.(css|styl|less|sass|scss)$': 'jest-css-modules-transform',
    },

    transformIgnorePatterns: modulesPattern(
        '@vscode/webview-ui-toolkit/',
        '@microsoft/',
        'exenv-es6/',
        '@atlaskit/',
        'flatten-anything/',
        'filter-anything/',
        'merge-anything',
        'is-what/',
        'axios-curlirize/',
    ),

    collectCoverage: true,
    collectCoverageFrom: [
        `src/**/*.${testExtension}`,
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}', // Exclude test files
    ],
    coverageDirectory: `coverage/${project}`,
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover', 'html'],

    coverageThreshold: {
        global:
            testExtension === 'ts'
                ? {
                      statements: 70,
                      branches: 62,
                      functions: 62,
                      lines: 70,
                  }
                : /* tsx */ {
                      statements: 7,
                      branches: 5,
                      functions: 5,
                      lines: 7,
                  },
    },
});

export default config;
