module.exports = {
    displayName: 'unit',
    roots: ['<rootDir>'],
    testMatch: ['**/test/**/*.+(ts|ts|js)', '**/?(*.)+(spec|test).+(ts|ts|js)'],
    transform: {
        '^.+\\.(min.js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
            },
        ],
    },
    transformIgnorePatterns: ['/node_modules/'],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/src/react/'],
    setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}', // Exclude test files
        '!src/react/**/*.{ts,tsx}',
    ],
    coverageDirectory: 'coverage/unit',
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover'],
};
