const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const ENV_VARS = [
    // FX3 configuration
    'ATLASCODE_FX3_API_KEY',
    'ATLASCODE_FX3_ENVIRONMENT',
    'ATLASCODE_FX3_TARGET_APP',
    'ATLASCODE_FX3_TIMEOUT',

    // Developer feature flag overrides
    'ATLASCODE_FF_OVERRIDES',
    'ATLASCODE_EXP_OVERRIDES_BOOL',
    'ATLASCODE_EXP_OVERRIDES_STRING',

    // Is this BBY? (set to "true" if this is a special internal build)
    'ROVODEV_BBY',
];

function createEnvPlugin({ nodeEnv, isBrowser = false }) {
    const definitions = {
        ...Object.fromEntries(
            ENV_VARS.map((varName) => [`process.env.${varName}`, JSON.stringify(process.env[varName])]),
        ),
        'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    };

    // Add process.browser for browser builds
    if (isBrowser) {
        definitions['process.browser'] = JSON.stringify(true);
    }

    return new webpack.DefinePlugin(definitions);
}

module.exports = { createEnvPlugin };
