module.exports = {
    roots: ['<rootDir>'],
    testMatch: ['**/test/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
    transform: {
        '^.+\\.(min.js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
            },
        ],
    },
    transformIgnorePatterns: ['/node_modules/'],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
    // coverage configuration
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover'],
};
