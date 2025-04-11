module.exports = {
    rules: {
        'no-var': 'error',
        'prefer-const': 'error',
        'no-multi-assign': 'error',
        'no-unused-expressions': [
            'error',
            {
                allowShortCircuit: true,
                allowTernary: true,
            },
        ],
        'no-restricted-imports': [
            'error',
            {
                paths: ['vscode'],
                patterns: [
                    '@material-ui/core/*',
                    '@atlassianlabs/guipi-core-components/*',
                    '@atlassianlabs/guipi-core-controller/*',
                    '@atlassianlabs/guipi-jira-components/*',
                    '@atlassianlabs/jira-metaui-client/*',
                    '@atlassianlabs/jira-metaui-transformer/*',
                    '@atlassianlabs/jira-pi-client/*',
                    '@atlassianlabs/jira-pi-common-models/*',
                    '@atlassianlabs/pi-client-common/*',
                    '**/*/container',
                    '**/*/extension',
                ],
            },
        ],
    },
};
