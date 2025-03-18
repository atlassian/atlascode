const _baseConfig = (project, testExtension) => ({
    displayName: project,
    roots: ['<rootDir>'],
    
    testMatch: [`**/*.test.${testExtension}`],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],

    transform: {
        '^.+\\.(js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: project === 'react' ? ({ esModuleInterop: true }) : false,
                isolatedModules: project === 'react',
            },
        ],
    },
    transformIgnorePatterns: ['/node_modules/(?!(@vscode/webview-ui-toolkit/|@microsoft/|exenv-es6/))'],

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
            statements: 20,
            branches: 7,
            functions: 7,
            lines: 20,
        } : /* tsx */{            
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0,
        },
    },
});

module.exports = {
    projects: ['<rootDir>/jest.*.config.js'],
    verbose: true,

    // custom exports for individual projects
    _baseConfig,
};
