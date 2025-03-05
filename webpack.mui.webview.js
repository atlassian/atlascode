const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const dotenv = require('dotenv');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const pageTsx = process.env.PAGETSX ? process.env.PAGETSX : 'config/ConfigPage.tsx';
const view = process.env.VIEW ? process.env.VIEW : 'atlascodeSettingsV2';
const theme = process.env.THEME ? process.env.THEME : 'dark';

dotenv.config();

module.exports = {
    mode: 'development',
    context: path.resolve(__dirname, 'src'),
    entry: [`./react/atlascode/${pageTsx}`, './react/index-dev.tsx'],
    devtool: 'cheap-module-source-map',
    output: {
        pathinfo: true,
        path: path.resolve(__dirname, 'build'),
        chunkFilename: 'static/js/[name].chunk.js',
        filename: 'static/js/bundle.js',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
    },
    devServer: {
        static: './',
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.json') })],
        fallback: {
            path: require.resolve('path-browserify'),
        },
    },
    plugins: [
        new MiniCssExtractPlugin(),
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
                configFile: resolveApp('tsconfig.json'),
            },
        }),
        new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),
        new HtmlWebPackPlugin({
            template: '../devhtml/devindex.html',
            templateParameters: {
                view: view,
                theme: theme,
            },
        }),
        new webpack.DefinePlugin({
            'process.env.ATLASCODE_FX3_API_KEY': JSON.stringify(process.env.ATLASCODE_FX3_API_KEY),
            'process.env.ATLASCODE_FX3_ENVIRONMENT': JSON.stringify(process.env.ATLASCODE_FX3_ENVIRONMENT),
            'process.env.ATLASCODE_FX3_TARGET_APP': JSON.stringify(process.env.ATLASCODE_FX3_TARGET_APP),
            'process.env.ATLASCODE_FX3_TIMEOUT': JSON.stringify(process.env.ATLASCODE_FX3_TIMEOUT),
            'process.env.ATLASCODE_TEST_USER_API_TOKEN': JSON.stringify(process.env.ATLASCODE_TEST_USER_API_TOKEN),
            'process.env.ATLASCODE_FF_OVERRIDES': JSON.stringify(process.env.ATLASCODE_FF_OVERRIDES),
            'process.env.ATLASCODE_EXP_OVERRIDES_BOOL': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_BOOL),
            'process.env.ATLASCODE_EXP_OVERRIDES_STRING': JSON.stringify(process.env.ATLASCODE_EXP_OVERRIDES_STRING),
            'process.env.CI': JSON.stringify(process.env.CI),
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
                            hmr: process.env.NODE_ENV === 'development',
                        },
                    },
                    'css-loader',
                ],
            },
        ],
    },
};
