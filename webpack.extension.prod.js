const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const dotenv = require('dotenv');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

dotenv.config();

module.exports = [
    {
        bail: true,
        name: 'extension',
        mode: 'production',
        target: 'node',
        entry: {
            extension: './src/extension.ts',
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    include: [
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/analytics-node.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/http-client.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/event-queue.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/abort.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/plugins/segmentio/publisher.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/Element.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/CSSStyleDeclaration.js'),
                    ],
                },
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.json'],
            plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.notest.json') })],
            alias: {
                parse5$: 'parse5/dist/cjs/index.js',
                axios: path.resolve(__dirname, 'node_modules/axios/lib/axios.js'),
                semver: path.resolve(__dirname, 'node_modules/semver'),
                bufferutil: path.resolve(__dirname, 'node_modules/bufferutil'),
            },
            fallback: {
                bufferutil: false,
                'utf-8-validate': false,
                path: require.resolve('path-browserify'),
            },
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: 'commonjs',
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        keep_fnames: true,
                        compress: {
                            comparisons: false,
                        },
                        output: {
                            comments: false,
                            ascii_only: true,
                        },
                    },
                }),
            ],
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'main',
                        test: /\.css$/,
                        chunks: 'all',
                        enforce: true,
                    },
                },
            },
        },
        plugins: [
            new webpack.IgnorePlugin({
                resourceRegExp: /iconv-loader\.js/,
            }),
            new webpack.WatchIgnorePlugin({
                paths: [/\.js$/, /\.d\.ts$/],
            }),
            new webpack.DefinePlugin({
                'process.env.ATLASCODE_FX3_API_KEY': JSON.stringify(process.env.ATLASCODE_FX3_API_KEY),
                'process.env.ATLASCODE_FX3_ENVIRONMENT': JSON.stringify(process.env.ATLASCODE_FX3_ENVIRONMENT),
                'process.env.ATLASCODE_FX3_TARGET_APP': JSON.stringify(process.env.ATLASCODE_FX3_TARGET_APP),
                'process.env.ATLASCODE_FX3_TIMEOUT': JSON.stringify(process.env.ATLASCODE_FX3_TIMEOUT),
                'process.env.ATLASCODE_FF_OVERRIDES': JSON.stringify(process.env.ATLASCODE_FF_OVERRIDES),
                'process.env.ATLASCODE_EXP_OVERRIDES_BOOL': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_BOOL),
                'process.env.ATLASCODE_EXP_OVERRIDES_STRING': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_STRING),
            }),
        ],
        externals: ['vscode'],
    },
    {
        bail: true,
        name: 'uninstall',
        mode: 'production',
        target: 'node',
        entry: {
            extension: './src/uninstall/uninstall.ts',
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    include: [
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/analytics-node.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/http-client.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/event-queue.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/abort.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/plugins/segmentio/publisher.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/Element.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/CSSStyleDeclaration.js'),
                    ],
                },
                {
                    test: /\.tsx?$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/],
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                semver: path.resolve(__dirname, 'node_modules/semver'),
                bufferutil: path.resolve(__dirname, 'node_modules/bufferutil'),
            },
        },

        output: {
            publicPath: '',
            filename: 'uninstall.js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: 'commonjs',
            devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
        },
        externals: ['vscode'],
    },
];
