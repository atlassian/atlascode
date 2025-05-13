module.exports = {
    extends: ['plugin:import/typescript', 'prettier'],
    env: {
        browser: true,
        es6: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true, // Allows for the parsing of JSX
        },
    },
    plugins: [
        '@typescript-eslint',
        //"@typescript-eslint/tslint",
        'react',
        'react-hooks',
        'import',
        'prettier',
        '@stylistic/js',
        'simple-import-sort',
    ],
    rules: {
        'prettier/prettier': 'error',
        'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        'react-hooks/rules-of-hooks': 'error',
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
            { devDependencies: ['**/webpack.*', '**/test/*', '**/*.test.js', '**/*.spec.js', '**/*.test.ts'] },
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
        'no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'none',
                caughtErrors: 'all',
                ignoreRestSiblings: false,
            },
        ],
        'brace-style': 'off',
        'no-throw-literal': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'no-cond-assign': 'error',
        'no-multi-assign': 'error',
        'no-unused-expressions': [
            'error',
            {
                allowShortCircuit: true,
                allowTernary: true,
            },
        ],
        curly: 'error',
        eqeqeq: ['error', 'always'],
        semi: 'off',
        '@stylistic/js/semi': ['error', 'always'],
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
};
