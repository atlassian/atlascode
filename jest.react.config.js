module.exports = {
    displayName: 'react',
    roots: ['<rootDir>'],
    testMatch: ['**/react/**/*.test.+(ts|tsx)'],
    transform: {
        '^.+\\.(min.js|js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.react.json',
                isolatedModules: true,
            },
        ],
    },
    transformIgnorePatterns: ['/node_modules/(?!(@vscode/webview-ui-toolkit/|@microsoft/|exenv-es6/))'],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/', '!/src/react/'],
    setupFilesAfterEnv: ['<rootDir>/setupTestsReact.js'],
    testEnvironment: 'jsdom',
    collectCoverage: true,
    collectCoverageFrom: [
        'src/react/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}', // Exclude test files
    ],
    coverageDirectory: 'coverage/react',
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover'],
};
