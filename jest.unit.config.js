const { _baseConfig } = require('./jest.config');

module.exports = {
    ..._baseConfig('unit', 'ts'),

    setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
};
