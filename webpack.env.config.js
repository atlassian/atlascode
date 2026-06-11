const webpack = require('webpack');
const dotenv = require('dotenv');

dotenv.config();

const ENV_VARS = [
    'ATLASCODE_FX3_API_KEY',
    'ATLASCODE_FX3_ENVIRONMENT',
    'ATLASCODE_FX3_TARGET_APP',
    'ATLASCODE_FX3_TIMEOUT',
    'ATLASCODE_FF_OVERRIDES',
    'ATLASCODE_EXP_OVERRIDES_BOOL',
    'ATLASCODE_EXP_OVERRIDES_STRING',
    'ROVODEV_BBY',
    'BBY_USERID',
    'ROVODEV_PORT',
    'ROVODEV_REBRAND_JCA',
    'SENTRY_ENABLED',
    'SENTRY_DSN',
    'SENTRY_ENVIRONMENT',
    'SENTRY_SAMPLE_RATE',
];

// Vars that must always be defined (default to "" if unset) so DefinePlugin substitutes them
const ALWAYS_DEFINE_VARS = new Set(['ROVODEV_BBY', 'ROVODEV_REBRAND_JCA', 'SANDBOX_VERY_LARGE_REPO']);

function createEnvPlugin({ nodeEnv, isBrowser = false }) {
    const definitions = {
        ...Object.fromEntries(
            ENV_VARS.map((varName) => {
                const raw = process.env[varName];
                const value = raw === undefined && ALWAYS_DEFINE_VARS.has(varName) ? '' : raw;
                return [`process.env.${varName}`, JSON.stringify(value)];
            }),
        ),
        'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    };

    if (isBrowser) {
        definitions['process.browser'] = JSON.stringify(true);
    }

    return new webpack.DefinePlugin(definitions);
}

module.exports = { createEnvPlugin };
