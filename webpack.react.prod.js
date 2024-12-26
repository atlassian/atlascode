const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const dotenv = require('dotenv');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CSSMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const autoprefixer = require('autoprefixer');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

dotenv.config();

module.exports = {
    bail: true,
    mode: 'production',
    entry: {
        main: resolveApp('./src/webviews/components/index.tsx'),
        mui: resolveApp('./src/react/index.tsx'),
    },
    output: {
        publicPath: '',
        path: path.resolve(__dirname, 'build'),
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
    },
    optimization: {
        minimizer: [
            new CSSMinimizerPlugin({}),
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
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
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.notest.json') })],
        fallback: {
            path: require.resolve('path-browserify'),
        },
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
        new WebpackManifestPlugin({
            fileName: 'asset-manifest.json',
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /iconv-loader\.js/,
        }),
        new webpack.WatchIgnorePlugin({
            paths: [/\.js$/, /\.d\.ts$/],
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: resolveApp('tsconfig.notest.json'),
            },
        }),
        new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),

        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
        }),
        new webpack.DefinePlugin({
            'process.env.ATLASCODE_FX3_API_KEY': JSON.stringify(process.env.ATLASCODE_FX3_API_KEY),
            'process.env.ATLASCODE_FX3_ENVIRONMENT': JSON.stringify(process.env.ATLASCODE_FX3_ENVIRONMENT),
            'process.env.ATLASCODE_FX3_TARGET_APP': JSON.stringify(process.env.ATLASCODE_FX3_TARGET_APP),
            'process.env.ATLASCODE_FX3_TIMEOUT': JSON.stringify(process.env.ATLASCODE_FX3_TIMEOUT),
            'process.env.ATLASCODE_TEST_USER_API_TOKEN': JSON.stringify(process.env.ATLASCODE_TEST_USER_API_TOKEN),
            'process.env.CI': JSON.stringify(process.env.CI),
        }),
    ],
    performance: {
        // About twice the default value of 244 Kib, to remove the warning
        // Shouldn't be a problem since this is an extension
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
    watchOptions: {
        ignored: /node_modules/,
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                // Include ts, tsx, js, and jsx files.
                test: /\.(ts|js)x?$/,
                exclude: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/],
                use: [{ loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } }],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            // you can specify a publicPath here
                            // by default it uses publicPath in webpackOptions.output
                            publicPath: '../',
                        },
                    },
                    {
                        loader: require.resolve('css-loader'),
                        options: {
                            importLoaders: 1,
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    [
                                        'postcss-preset-env',
                                        {
                                            // Necessary for external CSS imports to work
                                            // https://github.com/facebookincubator/create-react-app/issues/2677
                                            ident: 'postcss',

                                            plugins: () => [
                                                require('postcss-flexbugs-fixes'),
                                                autoprefixer({
                                                    overrideBrowserslist: ['last 4 Chrome versions'],
                                                    flexbox: 'no-2009',
                                                }),
                                            ],
                                        },
                                    ],
                                ],
                            },
                        },
                    },
                ],
            },
        ],
    },
};
