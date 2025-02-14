module.exports = {
    rules: {
        'no-var': 'error',
        'prefer-const': 'error',
        'no-restricted-imports': [
            'error',
            {
                paths: ['vscode'],
                patterns: [
                    '@material-ui/core/*',
                    '@atlaskit/*',
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
