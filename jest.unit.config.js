const { _baseConfig } = require('./jest.config');

module.exports = {
    ..._baseConfig('unit', 'ts'),

    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],
};
