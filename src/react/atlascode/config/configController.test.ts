// Mock React first
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useCallback: jest.fn((fn) => fn),
    useMemo: jest.fn((fn) => fn()),
    useReducer: jest.fn(() => [{}, jest.fn()]),
    createContext: jest.fn((defaultValue) => ({
        Provider: jest.fn(),
        Consumer: jest.fn(),
        displayName: 'MockContext',
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
    })),
    default: {
        createContext: jest.fn((defaultValue) => ({
            Provider: jest.fn(),
            Consumer: jest.fn(),
            displayName: 'MockContext',
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            _threadCount: 0,
        })),
    },
}));

import React from 'react';

import { ConfigTarget } from '../../../lib/ipc/models/config';
import { ConfigChanges, ConfigControllerContext, emptyApi } from './configController';

// Mock external dependencies
jest.mock('../messagingApi', () => ({
    useMessagingApi: jest.fn(() => ({
        postMessage: jest.fn(),
        postMessagePromise: jest.fn(),
    })),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
}));

describe('configController', () => {
    describe('exports', () => {
        it('should export ConfigControllerApi interface', () => {
            // Test that the interface exists by checking the emptyApi implementation
            expect(emptyApi).toBeDefined();
            expect(typeof emptyApi.postMessage).toBe('function');
            expect(typeof emptyApi.updateConfig).toBe('function');
            expect(typeof emptyApi.setConfigTarget).toBe('function');
            expect(typeof emptyApi.refresh).toBe('function');
            expect(typeof emptyApi.openLink).toBe('function');
            expect(typeof emptyApi.login).toBe('function');
            expect(typeof emptyApi.remoteLogin).toBe('function');
            expect(typeof emptyApi.logout).toBe('function');
            expect(typeof emptyApi.fetchJqlOptions).toBe('function');
            expect(typeof emptyApi.fetchJqlSuggestions).toBe('function');
        });

        it('should export ConfigControllerContext', () => {
            expect(ConfigControllerContext).toBeDefined();
            expect(React.createContext).toHaveBeenCalled();
        });

        it('should export emptyApi with all required methods', () => {
            expect(emptyApi).toEqual({
                postMessage: expect.any(Function),
                updateConfig: expect.any(Function),
                setConfigTarget: expect.any(Function),
                refresh: expect.any(Function),
                openLink: expect.any(Function),
                login: expect.any(Function),
                remoteLogin: expect.any(Function),
                logout: expect.any(Function),
                fetchJqlOptions: expect.any(Function),
                fetchJqlSuggestions: expect.any(Function),
                fetchFilterSearchResults: expect.any(Function),
                validateJql: expect.any(Function),
                createJiraIssue: expect.any(Function),
                createPullRequest: expect.any(Function),
                viewPullRequest: expect.any(Function),
                viewJiraIssue: expect.any(Function),
                openNativeSettings: expect.any(Function),
                startAuthFlow: expect.any(Function),
            });
        });
    });

    describe('emptyApi methods', () => {
        it('should have postMessage that does nothing', () => {
            expect(() => emptyApi.postMessage({} as any)).not.toThrow();
        });

        it('should have updateConfig that does nothing', () => {
            const changes: ConfigChanges = { 'test.setting': true };
            expect(() => emptyApi.updateConfig(changes)).not.toThrow();
            expect(() => emptyApi.updateConfig(changes, ['remove.setting'])).not.toThrow();
        });

        it('should have setConfigTarget that does nothing', () => {
            expect(() => emptyApi.setConfigTarget(ConfigTarget.User)).not.toThrow();
            expect(() => emptyApi.setConfigTarget(ConfigTarget.Workspace)).not.toThrow();
            expect(() => emptyApi.setConfigTarget(ConfigTarget.WorkspaceFolder)).not.toThrow();
        });

        it('should have refresh that does nothing', () => {
            expect(() => emptyApi.refresh()).not.toThrow();
        });

        it('should have openLink that does nothing', () => {
            expect(() => emptyApi.openLink('atlassian-getting-started' as any)).not.toThrow();
        });

        it('should have login that does nothing', () => {
            const site = { id: 'test-site' } as any;
            const auth = { username: 'test' } as any;
            expect(() => emptyApi.login(site, auth)).not.toThrow();
        });

        it('should have remoteLogin that does nothing', () => {
            expect(() => emptyApi.remoteLogin()).not.toThrow();
        });

        it('should have logout that does nothing', () => {
            const site = { id: 'test-site' } as any;
            expect(() => emptyApi.logout(site)).not.toThrow();
        });

        it('should have fetchJqlOptions that returns empty promise', async () => {
            const site = { id: 'test-site' } as any;
            const result = await emptyApi.fetchJqlOptions(site);
            expect(result).toEqual({
                visibleFieldNames: [],
                visibleFunctionNames: [],
                jqlReservedWords: [],
            });
        });

        it('should have fetchJqlSuggestions that returns empty array', async () => {
            const site = { id: 'test-site' } as any;
            const result = await emptyApi.fetchJqlSuggestions(site, 'assignee', 'test');
            expect(result).toEqual([]);
        });

        it('should have fetchFilterSearchResults that returns empty results', async () => {
            const site = { id: 'test-site' } as any;
            const result = await emptyApi.fetchFilterSearchResults(site, 'test');
            expect(result).toEqual({
                maxResults: 25,
                offset: 0,
                total: 0,
                isLast: true,
                filters: [],
            });
        });

        it('should have validateJql that returns no errors', async () => {
            const site = { id: 'test-site' } as any;
            const result = await emptyApi.validateJql(site, 'assignee = currentUser()');
            expect(result).toEqual({ errors: [] });
        });

        it('should have createJiraIssue that does nothing', () => {
            expect(() => emptyApi.createJiraIssue()).not.toThrow();
        });

        it('should have createPullRequest that does nothing', () => {
            expect(() => emptyApi.createPullRequest()).not.toThrow();
        });

        it('should have viewPullRequest that does nothing', () => {
            expect(() => emptyApi.viewPullRequest()).not.toThrow();
        });

        it('should have viewJiraIssue that does nothing', () => {
            expect(() => emptyApi.viewJiraIssue()).not.toThrow();
        });

        it('should have openNativeSettings that does nothing', () => {
            expect(() => emptyApi.openNativeSettings()).not.toThrow();
        });
    });

    describe('type definitions', () => {
        it('should define ConfigChanges type', () => {
            const changes: ConfigChanges = {
                'jira.enabled': true,
                'bitbucket.enabled': false,
                'test.setting': 'value',
            };
            expect(typeof changes).toBe('object');
            expect(changes['jira.enabled']).toBe(true);
            expect(changes['bitbucket.enabled']).toBe(false);
            expect(changes['test.setting']).toBe('value');
        });

        it('should work with ConfigTarget enum values', () => {
            expect(ConfigTarget.User).toBeDefined();
            expect(ConfigTarget.Workspace).toBeDefined();
            expect(ConfigTarget.WorkspaceFolder).toBeDefined();
        });
    });
});
