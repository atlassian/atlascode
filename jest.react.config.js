const { _baseConfig } = require('./jest.config');

module.exports = {
    ..._baseConfig('react', 'tsx'),

    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/setupTestsReact.js'],
};
