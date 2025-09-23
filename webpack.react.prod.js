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
const { CompiledExtractPlugin } = require('@compiled/webpack-loader');

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
                prosemirror: {
                    name: 'prosemirror',
                    test: /[\\/]node_modules[\\/]prosemirror-/,
                    chunks: 'all',
                    priority: 30,
                    enforce: true,
                },
                atlaskit: {
                    name: 'atlaskit',
                    test: /[\\/]node_modules[\\/]@atlaskit[\\/]/,
                    chunks: 'all',
                    priority: 20,
                },
                styles: {
                    name: 'main',
                    test: /^\.\/src\/webviews\.css$/,
                    chunks: 'all',
                    enforce: true,
                },
                styles2: {
                    name: 'mui',
                    test: /^\.\/src\/react\.css$/,
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
        alias: {
            // Resolve ProseMirror conflicts by using unified versions
            'prosemirror-model': path.resolve(__dirname, 'node_modules/prosemirror-model'),
            'prosemirror-state': path.resolve(__dirname, 'node_modules/prosemirror-state'),
            'prosemirror-view': path.resolve(__dirname, 'node_modules/prosemirror-view'),
            'prosemirror-commands': path.resolve(__dirname, 'node_modules/prosemirror-commands'),
            'prosemirror-gapcursor': path.resolve(__dirname, 'node_modules/prosemirror-gapcursor'),
            'prosemirror-history': path.resolve(__dirname, 'node_modules/prosemirror-history'),
            'prosemirror-keymap': path.resolve(__dirname, 'node_modules/prosemirror-keymap'),
            'prosemirror-dropcursor': path.resolve(__dirname, 'node_modules/prosemirror-dropcursor'),
            'prosemirror-example-setup': path.resolve(__dirname, 'node_modules/prosemirror-example-setup'),
            'prosemirror-inputrules': path.resolve(__dirname, 'node_modules/prosemirror-inputrules'),
            'prosemirror-markdown': path.resolve(__dirname, 'node_modules/prosemirror-markdown'),
            'prosemirror-mentions': path.resolve(__dirname, 'node_modules/prosemirror-mentions'),
            'prosemirror-menu': path.resolve(__dirname, 'node_modules/prosemirror-menu'),
            // Fix Atlaskit editor compatibility with newer ProseMirror versions
            '@atlaskit/editor-prosemirror/view': path.resolve(__dirname, 'node_modules/prosemirror-view'),
        },
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            ignoreOrder: true,
        }),
        new CompiledExtractPlugin({
            sortShorthand: true,
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
            'process.env.ATLASCODE_FF_OVERRIDES': JSON.stringify(process.env.ATLASCODE_FF_OVERRIDES),
            'process.env.ATLASCODE_EXP_OVERRIDES_BOOL': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_BOOL),
            'process.env.ATLASCODE_EXP_OVERRIDES_STRING': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_STRING),
            'process.env.ROVODEV_BBY': JSON.stringify(process.env.ROVODEV_BBY),
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.browser': JSON.stringify(true),
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    performance: {
        maxEntrypointSize: 350000,
        maxAssetSize: 14680064, // 14 MiB for atlaskit chunk
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
                use: [
                    { loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } },
                    {
                        loader: '@compiled/webpack-loader',
                        options: {
                            transformerBabelPlugins: ['@atlaskit/tokens/babel-plugin'],
                            extract: true,
                            inlineCss: true,
                        },
                    },
                ],
            },

            {
                test: /compiled(-css)?\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },

            {
                test: /(?<!compiled-css)(?<!\.compiled)\.css$/i,
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
            {
                test: /\.svg$/,
                type: 'asset/resource',
                generator: {
                    filename: 'static/media/[name].[hash:8][ext]',
                },
            },
        ],
    },
};
