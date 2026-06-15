function modulesPattern(...args) {
    if (args.length === 0) {
        return undefined;
    }
    return [`/node_modules/(?!(${args.join('|')}))`];
}

const baseConfigFor = (project, testExtension) => ({
    displayName: project,
    roots: ['<rootDir>'],

    moduleNameMapper: {
        '^src(.*)$': '<rootDir>/src$1',
        '^testsutil(/.+)?': '<rootDir>/testsutil$1',
        'monaco-editor': '<rootDir>/__mocks__/monaco-editor.ts',
        'package.json': '<rootDir>/__mocks__/packagejson.ts',
        '^clipboard-polyfill': '<rootDir>/node_modules/@atlaskit/editor-common/dist/cjs/clipboard/index.js',
        'prosemirror-model': '<rootDir>/node_modules/prosemirror-model',
        'prosemirror-view': '<rootDir>/node_modules/prosemirror-view',
    },

    testMatch: [`**/*.test.${testExtension}`],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],

    transform: {
        '^.+\\.(js|ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: project === 'react' ? { esModuleInterop: true, isolatedModules: true } : false,
            },
        ],
        '^.+\\.(css|styl|less|sass|scss)$': 'jest-css-modules-transform',
    },

    transformIgnorePatterns: modulesPattern(
        '@vscode/webview-ui-toolkit/',
        '@microsoft/',
        'exenv-es6/',
        '@atlaskit/',
        'flatten-anything/',
        'filter-anything/',
        'merge-anything',
        'is-what/',
        'axios-curlirize/',
        'clipboard-polyfill/',
    ),

    collectCoverage: true,
    collectCoverageFrom: [
        `src/**/*.${testExtension}`,
        '!src/**/*.d.ts',
        '!src/**/*.{spec,test}.{ts,tsx,js,jsx}',
    ],
    coverageDirectory: `coverage/${project}`,
    coverageReporters: ['json', 'lcov', 'text-summary', 'clover', 'html'],

    coverageThreshold: {
        global:
            testExtension === 'ts'
                ? {
                      statements: 65,
                      branches: 54,
                      functions: 59,
                      lines: 65,
                  }
                : {
                      statements: 14,
                      branches: 10,
                      functions: 10,
                      lines: 14,
                  },
    },
});

module.exports = { baseConfigFor };
