module.exports = {
    projects: ['<rootDir>/jest.react.config.js', '<rootDir>/jest.unit.config.js'],
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}', // Exclude test files
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover'],
};
