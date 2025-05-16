import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

// Create compat instance
const compat = new FlatCompat({
    baseDirectory: './',
    recommendedConfig: {},
    allConfig: {},
    overrideConfig: {},
    warnIncompatible: true
});

export default tseslint.config(
    ...compat.plugins('@typescript-eslint', 'react', 'react-hooks', 'import', 'prettier', 'simple-import-sort'),
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaFeatures: {
                    jsx: true, // Allows for the parsing of JSX
                },
            },
            globals: {
                browser: true,
                es6: true,
            },
        },
        ignores: [
            "/src/analytics-node-client/src/client.min.js",
            "/eslint.config.msj",
        ],
        rules: {
            'prettier/prettier': 'error',
            'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
            'react-hooks/exhaustive-deps': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'class',
                    format: ['PascalCase'],
                },
            ],
            'import/no-extraneous-dependencies': [
                'error',
                { devDependencies: true },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        '@atlassianlabs/guipi-core-components/*',
                        '@atlassianlabs/guipi-core-controller/*',
                        '@atlassianlabs/guipi-jira-components/*',
                        '@atlassianlabs/jira-metaui-client/*',
                        '@atlassianlabs/jira-metaui-transformer/*',
                        '@atlassianlabs/jira-pi-client/*',
                        '@atlassianlabs/jira-pi-common-models/*',
                        '@atlassianlabs/pi-client-common/*',
                    ],
                },
            ],
            "no-unused-vars": ["error", {
                "vars": "all",
                "args": "none",
                "caughtErrors": "all",
                "ignoreRestSiblings": false,
            }],
            'brace-style': 'off',
            'no-throw-literal': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-cond-assign': 'error',
            'no-multi-assign': 'error',
            'no-unused-expressions': ['error', {
                "allowShortCircuit": true,
                "allowTernary": true,
            }],
            curly: 'error',
            eqeqeq: ['error', 'always'],
            semi: 'off',
            'simple-import-sort/imports': 'error',
        },
        settings: {
            react: {
                version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
            },
            'import/parsers': {
                '@typescript-eslint/parser': ['.ts', '.tsx'],
            },
            'import/resolver': {
                typescript: {},
            },
        },
    },
    // Add missing dependencies
    {
        name: 'atlascode-ts-config',
        files: ['**/*.ts', '**/*.tsx'],
    }
);
