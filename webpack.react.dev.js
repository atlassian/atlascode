const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const dotenv = require('dotenv');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const autoprefixer = require('autoprefixer');
const { CompiledExtractPlugin } = require('@compiled/webpack-loader');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

dotenv.config();

module.exports = {
    mode: 'development',
    entry: {
        main: resolveApp('./src/webviews/components/index.tsx'),
        mui: resolveApp('./src/react/index.tsx'),
    },
    devtool: 'cheap-module-source-map',

    output: {
        publicPath: '',
        pathinfo: true,
        path: path.resolve(__dirname, 'build'),
        chunkFilename: 'static/js/[name].chunk.js',
        filename: 'static/js/[name].js',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
    },
    optimization: {
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
            },
        },
    },
    externals: ['utf-8-validate', 'bufferutil', 'vscode'],
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.json') })],
        fallback: {
            path: require.resolve('path-browserify'),
            process: false,
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
            filename: '[name].css',
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
            contextRegExp: /moment$/,
        }),
        new webpack.WatchIgnorePlugin({
            paths: [/\.js$/, /\.d\.ts$/],
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: resolveApp('tsconfig.json'),
            },
        }),
        new webpack.DefinePlugin({
            'process.env.ATLASCODE_FX3_API_KEY': JSON.stringify(process.env.ATLASCODE_FX3_API_KEY),
            'process.env.ATLASCODE_FX3_ENVIRONMENT': JSON.stringify(process.env.ATLASCODE_FX3_ENVIRONMENT),
            'process.env.ATLASCODE_FX3_TARGET_APP': JSON.stringify(process.env.ATLASCODE_FX3_TARGET_APP),
            'process.env.ATLASCODE_FX3_TIMEOUT': JSON.stringify(process.env.ATLASCODE_FX3_TIMEOUT),
            'process.env.ATLASCODE_FF_OVERRIDES': JSON.stringify(process.env.ATLASCODE_FF_OVERRIDES),
            'process.env.ATLASCODE_EXP_OVERRIDES_BOOL': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_BOOL),
            'process.env.ATLASCODE_EXP_OVERRIDES_STRING': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_STRING),
            'process.env.ROVODEV_BBY': JSON.stringify(process.env.ROVODEV_BBY)
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
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
                test: /\.js$/,
                use: [{ loader: 'source-map-loader' }],
                enforce: 'pre',
                include: /node_modules/,
                exclude: [/node_modules\/@atlaskit\/analytics-next-stable-react-context/],
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
