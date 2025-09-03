// Simple process polyfill for browser environment
module.exports = {
    env: {
        NODE_ENV: process.env.NODE_ENV || 'development'
    },
    browser: true,
    version: '',
    versions: {},
    platform: 'browser'
};